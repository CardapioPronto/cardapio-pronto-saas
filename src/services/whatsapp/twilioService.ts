import { toast } from "sonner";

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface TwilioMessageResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export class TwilioService {
  /**
   * Valida número de telefone no formato internacional
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Remove espaços e caracteres especiais
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Verifica se começa com + e tem entre 10 e 15 dígitos
    const internationalFormat = /^\+\d{10,15}$/;
    
    return internationalFormat.test(cleaned);
  }

  /**
   * Formata número para o padrão internacional do Twilio
   */
  static formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Se não começar com +, assume Brasil (+55)
    if (!cleaned.startsWith('+')) {
      // Remove 0 inicial se houver
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '+55' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Envia mensagem via Twilio usando edge function
   */
  static async sendMessage(
    credentials: TwilioCredentials,
    to: string,
    message: string
  ): Promise<TwilioMessageResponse> {
    try {
      const formattedTo = this.formatPhoneNumber(to);
      
      if (!this.validatePhoneNumber(formattedTo)) {
        return {
          success: false,
          error: 'Número de telefone inválido'
        };
      }

      // Chama a edge function do Supabase
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-twilio-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            accountSid: credentials.accountSid,
            authToken: credentials.authToken,
            from: credentials.phoneNumber,
            to: formattedTo,
            body: message
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || 'Erro ao enviar mensagem'
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageSid: data.messageSid
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem via Twilio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Testa a conexão com Twilio
   */
  static async testConnection(credentials: TwilioCredentials): Promise<boolean> {
    try {
      const testMessage = '🚀 Teste de integração Twilio - Sua configuração está funcionando!';
      const result = await this.sendMessage(
        credentials,
        credentials.phoneNumber, // Envia para o próprio número
        testMessage
      );

      if (result.success) {
        toast.success('Conexão com Twilio estabelecida com sucesso!');
        return true;
      } else {
        toast.error(`Erro ao conectar: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      toast.error('Erro ao testar conexão com Twilio');
      return false;
    }
  }
}
