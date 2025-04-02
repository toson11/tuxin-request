import CryptoJS from "crypto-js";

export type EncryptAlgorithm = "AES" | "DES" | "RC4";

export interface CryptoConfig {
  /** 加密算法 */
  algorithm?: EncryptAlgorithm;
  /** 密钥 */
  key?: string;
  /** 加密模式 */
  mode?: (typeof CryptoJS.mode)[keyof typeof CryptoJS.mode];
  /** 填充方式 */
  padding?: (typeof CryptoJS.pad)[keyof typeof CryptoJS.pad];
  /** 是否启用加密 */
  enabled?: boolean;
}

export class CryptoManager {
  private config: CryptoConfig;

  constructor(config: CryptoConfig) {
    this.config = {
      algorithm: "AES",
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
      enabled: true,
      key: "default-key",
      ...config,
    };
  }

  /**
   * 加密数据
   * @param data 要加密的数据
   * @returns 加密后的数据
   */
  public encrypt(data: any): string {
    if (!this.config.enabled || !this.config.key) return data;

    const jsonStr = JSON.stringify(data);
    const key = CryptoJS.enc.Utf8.parse(this.config.key);
    const encrypted = CryptoJS[this.config.algorithm!].encrypt(jsonStr, key, {
      mode: this.config.mode,
      padding: this.config.padding,
    });

    return encrypted.toString();
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据
   * @returns 解密后的数据
   */
  public decrypt(encryptedData: string): any {
    if (!this.config.enabled || !this.config.key) return encryptedData;

    try {
      const key = CryptoJS.enc.Utf8.parse(this.config.key);
      const decrypted = CryptoJS[this.config.algorithm!].decrypt(
        encryptedData,
        key,
        {
          mode: this.config.mode,
          padding: this.config.padding,
        }
      );

      const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("解密失败:", error);
      return encryptedData;
    }
  }

  /**
   * 更新配置
   * @param config 新的配置
   */
  public updateConfig(config: Partial<CryptoConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
