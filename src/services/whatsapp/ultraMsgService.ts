
import { toast } from "sonner";

export interface UltraMsgResponse {
  sent: boolean;
  message?: string;
  id?: string;
}

export interface UltraMsgSendRequest {
  to: string;
  body: string;
}

export interface UltraMsgCredentials {
  instanceId: string;
  token: string;
}

export class UltraMsgService {
  private static readonly BASE_URL = "https://api.ultramsg.com";
  
  static async sendMessage(
    credentials: UltraMsgCredentials,
    to: string, 
    body: string
  ): Promise<UltraMsgResponse> {
    try {
      if (!credentials.instanceId || !credentials.token) {
        throw new Error('Credenciais do UltraMsg não configuradas');
      }
      
      // Formatar número para padrão internacional (adicionar 55 se necessário)
      const formattedNumber = this.formatPhoneNumber(to);
      
      const url = `${this.BASE_URL}/${credentials.instanceId}/messages/chat`;
      
      const payload = {
        token: credentials.token,
        to: formattedNumber,
        body
      };
      
      console.log('Enviando mensagem UltraMsg para:', formattedNumber);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta UltraMsg:', errorText);
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Resposta UltraMsg:', result);
      
      return {
        sent: result.sent || false,
        message: result.message,
        id: result.id
      };
      
    } catch (error) {
      console.error('Erro ao enviar mensagem UltraMsg:', error);
      throw error;
    }
  }
  
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Se não começar com 55 (código do Brasil), adiciona
    if (cleaned.length === 11 && !cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    
    // Se começar com 0, remove (alguns números podem vir como 055...)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  }
  
  static validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Aceita números com 10, 11, 12 ou 13 dígitos
    return cleaned.length >= 10 && cleaned.length <= 13;
  }

  static validateCredentials(credentials: UltraMsgCredentials): boolean {
    return !!(credentials.instanceId && credentials.token);
  }
}
