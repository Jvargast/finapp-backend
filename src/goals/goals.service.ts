import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { GoalType, TransactionType } from '@prisma/client';
import { differenceInMonths } from 'date-fns';
import { IndicatorsService } from 'src/services/indicators.service';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private indicatorsService: IndicatorsService,
  ) {}

  async create(userId: string, createGoalDto: CreateGoalDto) {
    return this.prisma.financialGoal.create({
      data: {
        ...createGoalDto,
        userId,
      },
    });
  }

  async findAllWithAnalysis(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    const mainCurrency = user.profile.mainCurrency || 'CLP';

    const UF_VALUE = await this.indicatorsService.getUFValue();

    const goals = await this.prisma.financialGoal.findMany({
      where: { userId },
    });

    const cashFlow = await this.getUserMonthlyCashFlow(userId, mainCurrency);
    const monthlySavingsCapacity = cashFlow.income - cashFlow.expenses;

    const analyzedGoals = goals.map((goal) => {
      let analysis: any = {};

      const exchangeRate = goal.currency === 'UF' ? UF_VALUE : 1;

      switch (goal.type) {
        case GoalType.SAVING:
          if (this.isEmergencyFund(goal.name)) {
            analysis = this.calculateEmergencyFund(
              goal,
              cashFlow.expenses,
              exchangeRate,
            );
          } else {
            analysis = this.calculateSavingsFeasibility(
              goal,
              monthlySavingsCapacity,
              exchangeRate,
            );
          }
          break;

        case GoalType.DEBT:
          analysis = this.calculateDebtPayoff(
            goal,
            monthlySavingsCapacity,
            exchangeRate,
          );
          break;

        case GoalType.HOUSING:
          if (Number(goal.monthlyQuota) > 0) {
            analysis = this.calculateDebtPayoff(
              goal,
              monthlySavingsCapacity,
              exchangeRate,
            );
            analysis.type = 'MORTGAGE_PAYOFF';
          } else {
            analysis = this.calculateSavingsFeasibility(
              goal,
              monthlySavingsCapacity,
              exchangeRate,
            );
            analysis.type = 'HOUSING_SAVING';
          }
          break;

        case GoalType.INVESTMENT:
          if (Number(goal.estimatedYield) > 0) {
            analysis = this.calculateRealEstateInvestment(goal, exchangeRate);
          } else {
            analysis = this.calculateInvestmentProjection(
              goal,
              monthlySavingsCapacity,
              exchangeRate,
            );
          }
          break;

        case GoalType.RETIREMENT:
          analysis = this.calculateRetirementProjection(
            goal,
            monthlySavingsCapacity,
            exchangeRate,
          );
          break;

        case GoalType.CONTROL:
          analysis = {
            status: 'INFO',
            advice: 'Revisa tu sección de Presupuestos',
          };
          break;
      }

      return {
        ...goal,
        analysis,
      };
    });

    return analyzedGoals;
  }

  async findOneWithAnalysis(userId: string, goalId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    const mainCurrency = user.profile?.mainCurrency || 'CLP';
    const UF_VALUE = await this.indicatorsService.getUFValue();
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }

    const cashFlow = await this.getUserMonthlyCashFlow(userId, mainCurrency);
    const monthlySavingsCapacity = cashFlow.income - cashFlow.expenses;

    let analysis: any = {};
    const exchangeRate = goal.currency === 'UF' ? UF_VALUE : 1;

    switch (goal.type) {
      case GoalType.SAVING:
        if (this.isEmergencyFund(goal.name)) {
          analysis = this.calculateEmergencyFund(
            goal,
            cashFlow.expenses,
            exchangeRate,
          );
        } else {
          analysis = this.calculateSavingsFeasibility(
            goal,
            monthlySavingsCapacity,
            exchangeRate,
          );
        }
        break;

      case GoalType.DEBT:
        analysis = this.calculateDebtPayoff(
          goal,
          monthlySavingsCapacity,
          exchangeRate,
        );
        break;

      case GoalType.HOUSING:
        if (Number(goal.monthlyQuota) > 0) {
          analysis = this.calculateDebtPayoff(
            goal,
            monthlySavingsCapacity,
            exchangeRate,
          );
          analysis.type = 'MORTGAGE_PAYOFF';
        } else {
          analysis = this.calculateSavingsFeasibility(
            goal,
            monthlySavingsCapacity,
            exchangeRate,
          );
          analysis.type = 'HOUSING_SAVING';
        }
        break;

      case GoalType.INVESTMENT:
        if (Number(goal.estimatedYield) > 0) {
          analysis = this.calculateRealEstateInvestment(goal, exchangeRate);
        } else {
          analysis = this.calculateInvestmentProjection(
            goal,
            monthlySavingsCapacity,
            exchangeRate,
          );
        }
        break;

      case GoalType.RETIREMENT:
        analysis = this.calculateRetirementProjection(
          goal,
          monthlySavingsCapacity,
          exchangeRate,
        );
        break;

      case GoalType.CONTROL:
        analysis = {
          status: 'INFO',
          advice: 'Revisa tu sección de Presupuestos',
        };
        break;
    }

    console.log(analysis);
    return {
      ...goal,
      analysis,
    };
  }

  private calculateSavingsFeasibility(
    goal: any,
    monthlyCapacityCLP: number | null,
    exchangeRate: number = 1,
  ) {
    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);
    const remaining = target - current;

    if (remaining <= 0)
      return {
        status: 'COMPLETED',
        advice: '¡Meta lograda! Ya tienes el monto total.',
      };

    const today = new Date();
    const deadline = new Date(goal.deadline);
    let monthsLeft = differenceInMonths(deadline, today);
    if (monthsLeft <= 0) monthsLeft = 1;

    const requiredMonthly = remaining / monthsLeft;

    const formatMoney = (amount: number) => {
      if (goal.currency === 'UF') return `${amount.toFixed(2)} UF`;
      if (goal.currency === 'USD') return `US$ ${amount.toFixed(2)}`;
      return `$${Math.round(amount).toLocaleString('es-CL')}`;
    };

    if (monthlyCapacityCLP === null) {
      return {
        type: 'SAVINGS_ANALYSIS',
        monthsLeft,
        requiredMonthly: Number(requiredMonthly.toFixed(2)),
        yourCapacity: 0,
        status: 'UNKNOWN',
        advice: `Necesitas ahorrar ${formatMoney(requiredMonthly)} mensuales.`,
      };
    }

    const capacityInGoalCurrency = monthlyCapacityCLP / exchangeRate;

    const isFeasible = capacityInGoalCurrency >= requiredMonthly;
    const gap = requiredMonthly - capacityInGoalCurrency;

    const isHousing = goal.type === 'HOUSING';
    const contextText = isHousing ? 'para el pie de tu casa' : 'para tu meta';

    return {
      type: 'SAVINGS_ANALYSIS',
      monthsLeft,
      requiredMonthly: Number(requiredMonthly.toFixed(2)),
      yourCapacity: Number(capacityInGoalCurrency.toFixed(2)),

      status: isFeasible ? 'ON_TRACK' : 'AT_RISK',
      advice: isFeasible
        ? `¡Vas excelente! Tu ahorro actual cubre las ${formatMoney(requiredMonthly)} necesarias ${contextText}.`
        : `Te faltan ${formatMoney(gap)} mensuales ${contextText}. Intenta ajustar tu presupuesto en pesos.`,
    };
  }

  private calculateDebtPayoff(
    goal: any,
    paymentCapacity: number | null,
    exchangeRate: number = 1,
  ) {
    const principal =
      (Number(goal.targetAmount) - Number(goal.currentAmount)) * exchangeRate;
    const quota = Number(goal.monthlyQuota || 0) * exchangeRate;
    const annualRate = Number(goal.interestRate || 0) / 100;
    const monthlyRate = annualRate / 12;

    if (principal <= 0)
      return {
        status: 'COMPLETED',
        monthsToFree: 0,
        monthlyPayment: 0,
        advice: '¡Felicidades! Deuda pagada.',
      };

    if (paymentCapacity === null) {
      return {
        type: 'DEBT_ANALYSIS',
        monthsToFree: 0,
        monthlyPayment: 0,
        status: 'UNKNOWN',
        advice: `Moneda distinta. No podemos calcular el cruce exacto.`,
      };
    }

    if (quota > 0 && paymentCapacity < quota) {
      const deficit = quota - paymentCapacity;
      return {
        type: 'DEBT_ANALYSIS',
        status: 'CRITICAL',
        monthsToFree: 0,
        advice: `¡ALERTA! Tu flujo disponible ($${paymentCapacity.toLocaleString()}) no cubre la cuota del banco ($${quota.toLocaleString()}). Te faltan $${deficit.toLocaleString()} mensualmente.`,
      };
    }

    const effectivePayment = Math.max(paymentCapacity, quota);

    if (monthlyRate > 0) {
      const interestOnly = principal * monthlyRate;
      if (effectivePayment <= interestOnly) {
        return {
          type: 'DEBT_ANALYSIS',
          status: 'IMPOSSIBLE',
          monthsToFree: 0,
          monthlyPayment: effectivePayment,
          advice: `Peligro: Tu pago ($${effectivePayment.toLocaleString()}) es menor que los intereses ($${interestOnly.toFixed(0)}). La deuda nunca bajará.`,
        };
      }
    }

    const calculateMonths = (p: number, pmt: number, r: number) => {
      if (r === 0) return p / pmt;
      return -Math.log(1 - (r * p) / pmt) / Math.log(1 + r);
    };

    const monthsFast = calculateMonths(
      principal,
      effectivePayment,
      monthlyRate,
    );

    let monthsSlow = 0;
    let savedMonths = 0;
    //let savedInterest = 0;

    if (quota > 0 && effectivePayment > quota) {
      monthsSlow = calculateMonths(principal, quota, monthlyRate);
      savedMonths = Math.max(0, Math.ceil(monthsSlow) - Math.ceil(monthsFast));
    }

    const isAccelerated = savedMonths > 0;

    return {
      type: 'DEBT_ANALYSIS',
      monthsToFree: Math.ceil(monthsFast),
      monthlyPayment: Math.round(effectivePayment),
      status: isAccelerated ? 'ON_TRACK' : 'PLANNING',
      advice: isAccelerated
        ? `¡Excelente estrategia! Al pagar $${(effectivePayment - quota).toLocaleString()} extra sobre tu cuota, terminarás ${savedMonths} meses antes.`
        : `Estás pagando la cuota mínima de $${quota.toLocaleString()}. Terminarás en ${Math.ceil(monthsFast)} meses.`,
    };
  }

  private calculateInvestmentProjection(
    goal: any,
    monthlyAvailableCLP: number | null,
    exchangeRate: number = 1,
  ) {
    const currentAmount = Number(goal.currentAmount);
    const targetAmount = Number(goal.targetAmount);

    const annualRate = Number(goal.interestRate || 0) / 100;
    const monthlyRate = annualRate / 12;

    const today = new Date();
    const deadline = goal.deadline ? new Date(goal.deadline) : null;

    const months = deadline
      ? Math.max(1, differenceInMonths(deadline, today))
      : 12;

    let monthlyContribution = 0;

    if (monthlyAvailableCLP !== null) {
      monthlyContribution = monthlyAvailableCLP / exchangeRate;
    }

    let futureValue = currentAmount;
    let totalContributed = currentAmount;

    for (let i = 0; i < months; i++) {
      futureValue = futureValue * (1 + monthlyRate);
      futureValue += monthlyContribution;
      totalContributed += monthlyContribution;
    }

    const interestEarned = futureValue - totalContributed;

    const formatMoney = (amount: number) => {
      if (goal.currency === 'UF') return `${amount.toFixed(2)} UF`;
      if (goal.currency === 'USD') return `US$ ${amount.toFixed(2)}`;
      if (goal.currency === 'BTC') return `₿ ${amount.toFixed(6)}`;
      return `$${Math.round(amount).toLocaleString('es-CL')}`;
    };

    let status = 'NEUTRAL';
    let advice = '';

    if (monthlyAvailableCLP === null) {
      status = 'UNKNOWN';
      advice = `Calculado solo con el interés de tu saldo actual (${formatMoney(currentAmount)}). Conecta tus cuentas para proyectar aportes mensuales.`;
    } else {
      if (targetAmount > 0) {
        const isMet = futureValue >= targetAmount;
        status = isMet ? 'ON_TRACK' : 'NEEDS_ACTION';

        if (isMet) {
          const surplus = futureValue - targetAmount;
          advice = `¡Excelente! Gracias al interés compuesto del ${(annualRate * 100).toFixed(1)}%, superarás tu meta por ${formatMoney(surplus)}.`;
        } else {
          const percentage = ((futureValue / targetAmount) * 100).toFixed(0);
          advice = `Con tu aporte actual de ${formatMoney(monthlyContribution)}, llegarás al ${percentage}% (${formatMoney(futureValue)}). Necesitas aumentar tu inversión o buscar mayor rentabilidad.`;
        }
      } else {
        status = 'ON_TRACK';
        advice = `En ${months} meses, proyectamos que tendrás ${formatMoney(futureValue)} (Ganancia por intereses: ${formatMoney(interestEarned)}).`;
      }
    }

    return {
      type: 'INVESTMENT_PROJECTION',
      projectedAmount: Number(futureValue.toFixed(2)),
      interestEarned: Number(interestEarned.toFixed(2)),
      isGoalMet: targetAmount > 0 ? futureValue >= targetAmount : true,
      monthlyContribution: Number(monthlyContribution.toFixed(2)),
      status,
      advice,
      currency: goal.currency,
    };
  }

  private calculateEmergencyFund(
    goal: any,
    monthlyExpensesCLP: number | null,
    exchangeRate: number = 1,
  ) {
    const currentAmount = Number(goal.currentAmount);

    const savingsInExpensesCurrency = currentAmount * exchangeRate;

    const formatMoney = (amount: number) => {
      if (goal.currency === 'UF') return `${amount.toFixed(2)} UF`;
      if (goal.currency === 'USD') return `US$ ${amount.toFixed(2)}`;
      return `$${Math.round(amount).toLocaleString('es-CL')}`;
    };

    if (monthlyExpensesCLP === null || monthlyExpensesCLP === 0) {
      return {
        type: 'EMERGENCY_FUND_ANALYSIS',
        monthsCovered: 0,
        requiredMonthly: 0,
        status: 'NEEDS_ACTION',
        advice:
          'Para calcular cuánto dura tu fondo, necesitamos que registres tus gastos o transacciones mensuales primero.',
      };
    }

    const monthsCovered = savingsInExpensesCurrency / monthlyExpensesCLP;

    let status = 'AT_RISK';
    let advice = '';

    if (monthsCovered >= 6) {
      status = 'EXCELLENT';
      advice = `¡Salud financiera blindada! Tu fondo de ${formatMoney(currentAmount)} cubre más de 6 meses de tus gastos actuales.`;
    } else if (monthsCovered >= 3) {
      status = 'ON_TRACK';
      advice = `Tienes una base sólida. Cubres ${monthsCovered.toFixed(1)} meses. Lo ideal es llegar a 6 meses para estar totalmente seguro.`;
    } else if (monthsCovered >= 1) {
      status = 'AT_RISK';
      advice = `Vas por buen camino, pero ${monthsCovered.toFixed(1)} meses es poco margen. Intenta llegar al menos a 3 meses de cobertura.`;
    } else {
      status = 'CRITICAL';
      advice = `Alerta: Tu fondo actual (${formatMoney(currentAmount)}) no cubre ni un mes de gastos. Es prioritario aumentar este ahorro.`;
    }

    return {
      type: 'EMERGENCY_FUND_ANALYSIS',
      monthsCovered: parseFloat(monthsCovered.toFixed(1)),
      requiredToThreeMonths: Math.max(
        0,
        (monthlyExpensesCLP * 3) / exchangeRate - currentAmount,
      ),
      status,
      advice,
    };
  }

  private async getUserMonthlyCashFlow(userId: string, mainCurrency: string) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        account: { userId },
        date: { gte: threeMonthsAgo },
      },
      include: {
        account: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    const RATES_TO_CLP: Record<string, number> = {
      CLP: 1,
      USD: 945,
      EUR: 1020,
      UF: 38600,
      CAD: 700,
      BTC: 90000000,
    };

    const userCurrencyRate = RATES_TO_CLP[mainCurrency] || 1;

    transactions.forEach((t) => {
      const txCurrency = t.account.currency;
      const txRate = RATES_TO_CLP[txCurrency] || 1;

      const amountInMainCurrency =
        (Number(t.amount) * txRate) / userCurrencyRate;

      if (t.type === TransactionType.INCOME) {
        totalIncome += amountInMainCurrency;
      } else if (t.type === TransactionType.EXPENSE) {
        totalExpense += amountInMainCurrency;
      }
    });

    const divisor = 3;

    return {
      income: totalIncome / divisor,
      expenses: totalExpense / divisor,
      currency: mainCurrency,
    };
  }

  private isEmergencyFund(name: string): boolean {
    const keywords = [
      'emergencia',
      'imprevisto',
      'seguridad',
      'colchón',
      'reserva',
    ];
    return keywords.some((k) => name.toLowerCase().includes(k));
  }

  private calculateRealEstateInvestment(goal: any, exchangeRate: number = 1) {
    const propertyValue = Number(goal.targetAmount);
    const monthlyRent = Number(goal.estimatedYield || 0);
    const dividend = Number(goal.monthlyQuota || 0);

    if (propertyValue === 0)
      return { status: 'UNKNOWN', advice: 'Falta valor propiedad' };

    const capRate = ((monthlyRent * 12) / propertyValue) * 100;

    const cashFlowOriginal = monthlyRent - dividend;

    const cashFlowCLP = cashFlowOriginal * exchangeRate;

    let status = 'NEUTRAL';
    let advice = '';

    const formatMoney = (val: number) =>
      `$${Math.round(val).toLocaleString('es-CL')}`;

    if (cashFlowCLP > 0) {
      status = 'EXCELLENT';
      advice = `¡Gran negocio! El arriendo cubre el dividendo y te deja ${formatMoney(cashFlowCLP)} de ganancia mensual (Cap Rate: ${capRate.toFixed(1)}%).`;
    } else if (cashFlowCLP < 0) {
      status = 'AT_RISK';
      advice = `Cuidado: El arriendo no cubre el dividendo. Tienes un déficit mensual de ${formatMoney(Math.abs(cashFlowCLP))}.`;
    } else {
      status = 'ON_TRACK';
      advice =
        'Break-even: La propiedad se paga sola con el arriendo exacto. Tu ganancia será la plusvalía.';
    }

    return {
      type: 'REAL_ESTATE_ANALYSIS',
      capRate: capRate.toFixed(2),
      cashFlowCLP,
      status,
      advice,
    };
  }

  private calculateRetirementProjection(
    goal: any,
    monthlyContribution: number | null,
    exchangeRate: number = 1,
  ) {
    const baseAnalysis = this.calculateInvestmentProjection(
      goal,
      monthlyContribution,
      exchangeRate,
    );

    let advice = baseAnalysis.advice;

    if (baseAnalysis.status === 'ON_TRACK') {
      advice = `¡Vas muy bien! Tu fondo de retiro proyectado superará tu meta. El interés compuesto está trabajando a tu favor.`;
    } else if (baseAnalysis.status === 'NEEDS_ACTION') {
      advice = `Atención: Con tu aporte actual, podrías tener una brecha pensional. Intenta aumentar tu APV o ahorro voluntario.`;
    }

    return {
      ...baseAnalysis,
      type: 'RETIREMENT_ANALYSIS',
      advice,
    };
  }

  async delete(userId: string, goalId: string) {
    const goal = await this.prisma.financialGoal.findFirst({
      where: {
        id: goalId,
        userId: userId,
      },
    });

    if (!goal) {
      throw new NotFoundException(
        'Meta no encontrada o no tienes permisos para eliminarla.',
      );
    }
    return this.prisma.financialGoal.delete({
      where: { id: goalId },
    });
  }
}
