import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { GoalType, TransactionType } from '@prisma/client';
import { differenceInMonths, addMonths } from 'date-fns';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createGoalDto: CreateGoalDto) {
    return this.prisma.financialGoal.create({
      data: {
        ...createGoalDto,
        userId,
      },
    });
  }

  async findAllWithAnalysis(userId: string) {
    const goals = await this.prisma.financialGoal.findMany({
      where: { userId },
    });

    const cashFlow = await this.getUserMonthlyCashFlow(userId);
    const monthlySavingsCapacity = cashFlow.income - cashFlow.expenses;
    const monthlyExpenses = cashFlow.expenses;

    const analyzedGoals = goals.map((goal) => {
      let analysis: any = {};

      switch (goal.type) {
        case GoalType.SAVING:
          const isEmergency =
            goal.name.toLowerCase().includes('emergencia') ||
            goal.name.toLowerCase().includes('control');

          if (isEmergency) {
            analysis = this.calculateEmergencyFund(goal, monthlyExpenses);
          } else {
            analysis = this.calculateSavingsFeasibility(
              goal,
              monthlySavingsCapacity,
            );
          }
          break;

        case GoalType.PURCHASE:
          analysis = this.calculateSavingsFeasibility(
            goal,
            monthlySavingsCapacity,
          );
          break;

        case GoalType.DEBT:
          analysis = this.calculateDebtPayoff(goal, monthlySavingsCapacity);
          break;

        case GoalType.INVESTMENT:
          analysis = this.calculateInvestmentProjection(
            goal,
            monthlySavingsCapacity,
          );
          if (
            goal.name.toLowerCase().includes('jubilac') ||
            goal.name.toLowerCase().includes('retiro')
          ) {
            analysis.type = 'RETIREMENT_ANALYSIS';
          }
          break;
      }

      return {
        ...goal,
        analysis,
      };
    });

    return analyzedGoals;
  }

  private calculateSavingsFeasibility(goal: any, monthlyCapacity: number) {
    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);
    const remaining = target - current;

    if (remaining <= 0)
      return { status: 'COMPLETED', message: '¡Meta lograda!' };

    const today = new Date();
    const deadline = new Date(goal.deadline);
    let monthsLeft = differenceInMonths(deadline, today);
    if (monthsLeft <= 0) monthsLeft = 1;

    const requiredMonthly = remaining / monthsLeft;

    const isFeasible = monthlyCapacity >= requiredMonthly;
    const gap = requiredMonthly - monthlyCapacity;

    return {
      type: 'SAVINGS_ANALYSIS',
      monthsLeft,
      requiredMonthly: Math.round(requiredMonthly),
      yourCapacity: Math.round(monthlyCapacity),
      status: isFeasible ? 'ON_TRACK' : 'AT_RISK',
      advice: isFeasible
        ? 'Vas excelente. Tu ahorro mensual cubre lo necesario.'
        : `Te faltan $${Math.round(gap)} al mes para llegar a tiempo. Considera extender el plazo o recortar gastos.`,
    };
  }

  private calculateDebtPayoff(goal: any, paymentCapacity: number) {
    const principal = Number(goal.targetAmount) - Number(goal.currentAmount);
    const annualRate = Number(goal.interestRate || 0) / 100;
    const monthlyRate = annualRate / 12;

    if (paymentCapacity <= 0) {
      return {
        status: 'CRITICAL',
        advice: 'No tienes flujo de caja libre para pagar esta deuda.',
      };
    }

    let monthsToPay = 0;

    if (monthlyRate === 0) {
      monthsToPay = principal / paymentCapacity;
    } else {
      const interestOnly = principal * monthlyRate;

      if (paymentCapacity <= interestOnly) {
        return {
          status: 'IMPOSSIBLE',
          advice: `Peligro: Tu pago ($${paymentCapacity}) es menor que los intereses ($${interestOnly.toFixed(0)}). La deuda crecerá infinitamente.`,
        };
      }

      monthsToPay =
        -Math.log(1 - (monthlyRate * principal) / paymentCapacity) /
        Math.log(1 + monthlyRate);
    }

    return {
      type: 'DEBT_ANALYSIS',
      monthsToFree: Math.ceil(monthsToPay),
      monthlyPayment: Math.round(paymentCapacity),
      status: 'PLANNING',
      advice: `Pagando tu máximo posible ($${paymentCapacity}), saldrás de esta deuda en ${Math.ceil(monthsToPay)} meses.`,
    };
  }

  private calculateInvestmentProjection(
    goal: any,
    monthlyContribution: number,
  ) {
    const today = new Date();
    const deadline = new Date(goal.deadline);
    const months = differenceInMonths(deadline, today);

    const annualRate = Number(goal.interestRate || 5) / 100;
    const monthlyRate = annualRate / 12;

    let futureValue = Number(goal.currentAmount);
    let totalContributed = Number(goal.currentAmount);

    for (let i = 0; i < months; i++) {
      futureValue = futureValue * (1 + monthlyRate);
      futureValue += monthlyContribution;
      totalContributed += monthlyContribution;
    }

    const interestEarned = futureValue - totalContributed;
    const target = Number(goal.targetAmount);

    return {
      type: 'INVESTMENT_ANALYSIS',
      projectedAmount: Math.round(futureValue),
      interestEarned: Math.round(interestEarned),
      isGoalMet: futureValue >= target,
      monthlyContribution: Math.round(monthlyContribution),
      status: futureValue >= target ? 'ON_TRACK' : 'NEEDS_ACTION',
      advice:
        futureValue >= target
          ? `Gracias al interés compuesto, superarás tu meta por $${Math.round(futureValue - target)}.`
          : `Con tu aporte actual, llegarás al ${((futureValue / target) * 100).toFixed(0)}% de la meta. Necesitas invertir más.`,
    };
  }

  private calculateEmergencyFund(goal: any, monthlyExpenses: number) {
    const current = Number(goal.currentAmount);

    if (monthlyExpenses === 0) {
      return {
        status: 'UNKNOWN',
        advice: 'Necesitas registrar gastos para calcular tu fondo.',
      };
    }

    const monthsCovered = current / monthlyExpenses;

    let status = 'AT_RISK';
    let advice = `Solo cubres ${monthsCovered.toFixed(1)} meses. Lo ideal es llegar a 3 meses mínimo.`;

    if (monthsCovered >= 6) {
      status = 'ON_TRACK';
      advice =
        '¡Excelente salud financiera! Tienes más de 6 meses de gastos cubiertos.';
    } else if (monthsCovered >= 3) {
      status = 'ON_TRACK';
      advice =
        'Tienes una buena base (3 meses). Sigue así para mayor seguridad.';
    }

    return {
      type: 'EMERGENCY_FUND_ANALYSIS',
      monthsCovered: parseFloat(monthsCovered.toFixed(1)),
      requiredMonthly: 0,
      status,
      advice,
    };
  }

  private async getUserMonthlyCashFlow(userId: string) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        account: { userId },
        date: { gte: threeMonthsAgo },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      if (t.type === TransactionType.INCOME) totalIncome += Number(t.amount);
      if (t.type === TransactionType.EXPENSE) totalExpense += Number(t.amount);
    });

    const divisor = 3;

    return {
      income: totalIncome / divisor,
      expenses: totalExpense / divisor,
    };
  }
}
