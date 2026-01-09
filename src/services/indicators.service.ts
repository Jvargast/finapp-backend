import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class IndicatorsService {
  private readonly logger = new Logger(IndicatorsService.name);

  private cachedUF: number | null = null;
  private lastUpdate: string | null = null;

  async getUFValue(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    if (this.cachedUF && this.lastUpdate === today) {
      return this.cachedUF;
    }

    try {
      this.logger.log('Consultando API de mindicador.cl...');

      const response = await axios.get('https://mindicador.cl/api/uf');
      const currentValue = response.data.serie[0].valor;

      this.cachedUF = currentValue;
      this.lastUpdate = today;

      return currentValue;
    } catch (error) {
      this.logger.error('Error obteniendo UF', error);

      if (this.cachedUF) return this.cachedUF;
      return 38600;
    }
  }
}
