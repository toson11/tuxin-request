import { getValueByPath, setValueByPath } from "@/core/utils";
import { SensitiveConfig as Config } from "@/types";
import BaseManager from "./base-manager";
export class SensitiveManager extends BaseManager<Config> {
  constructor(config?: Config) {
    super({}, config);
  }

  /**
   * 脱敏手机号
   */
  private maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
  }

  /**
   * 脱敏邮箱
   */
  private maskEmail(email: string): string {
    return email.replace(/(.{2}).*(@.*)/, "$1***$2");
  }

  /**
   * 脱敏身份证号
   */
  private maskIdCard(idCard: string): string {
    return idCard.replace(/(\d{4})\d{10}(\d{4})/, "$1**********$2");
  }

  /**
   * 脱敏银行卡号
   */
  private maskBankCard(bankCard: string): string {
    return bankCard.replace(/(\d{4})\d{8,12}(\d{4})/, "$1********$2");
  }

  /**
   * 脱敏姓名
   */
  private maskName(name: string): string {
    return name.replace(/(.).*/, "$1*");
  }

  /**
   * 脱敏地址
   */
  private maskAddress(address: string): string {
    return address.replace(/(.{3}).*(.{3})/, "$1***$2");
  }

  /**
   * 脱敏数据
   * @param data 要脱敏的数据
   * @returns 脱敏后的数据
   */
  public desensitize(data: any, config?: Config): any {
    const { rules } = this.mergeConfig(config);
    if (!rules?.length || !data) return data;

    const result = JSON.parse(JSON.stringify(data));

    rules.forEach((rule) => {
      const value = getValueByPath(result, rule.path);
      if (!value) return;

      let maskedValue = value;
      if (rule.custom) {
        maskedValue = rule.custom(value);
      } else {
        switch (rule.type) {
          case "phone":
            maskedValue = this.maskPhone(value);
            break;
          case "email":
            maskedValue = this.maskEmail(value);
            break;
          case "idCard":
            maskedValue = this.maskIdCard(value);
            break;
          case "bankCard":
            maskedValue = this.maskBankCard(value);
            break;
          case "name":
            maskedValue = this.maskName(value);
            break;
          case "address":
            maskedValue = this.maskAddress(value);
            break;
        }
      }

      setValueByPath(result, rule.path, maskedValue);
    });

    return result;
  }
}
