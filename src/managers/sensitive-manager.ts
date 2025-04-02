import { SensitiveConfig } from "@/types";

type Config = Exclude<SensitiveConfig, boolean>;
export class SensitiveManager {
  private globalConfig: Config;

  constructor(config?: Config) {
    this.globalConfig = {
      rules: [],
      ...config,
    };
  }

  /**
   * 获取对象指定路径的值
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * 设置对象指定路径的值
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const parts = path.split(".");
    const last = parts.pop()!;
    const target = parts.reduce((acc, part) => {
      if (!(part in acc)) {
        acc[part] = {};
      }
      return acc[part];
    }, obj);
    target[last] = value;
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
    const { rules } = {
      ...this.globalConfig,
      ...config,
    };
    if (!rules?.length) return data;

    const result = JSON.parse(JSON.stringify(data));

    rules.forEach((rule) => {
      const value = this.getValueByPath(result, rule.path);
      if (!value) return;

      let maskedValue = value;
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
        case "custom":
          if (rule.custom) {
            maskedValue = rule.custom(value);
          }
          break;
      }

      this.setValueByPath(result, rule.path, maskedValue);
    });

    return result;
  }

  /**
   * 更新配置
   * @param config 新的配置
   */
  public updateConfig(config: Partial<Config>): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }
}
