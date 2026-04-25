export class UltraMsgService {
  static validatePhoneNumber(phoneNumber: string): boolean {
    const digits = phoneNumber.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }

  static formatPhoneNumber(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, "");

    if (digits.startsWith("55")) {
      return digits;
    }

    if (digits.startsWith("0")) {
      return `55${digits.slice(1)}`;
    }

    return `55${digits}`;
  }
}
