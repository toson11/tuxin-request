import CryptoJS from "crypto-js";
import { CryptoConfig } from "@/types";

export class CryptoManager {
  private globalConfig: CryptoConfig;

  constructor(config?: CryptoConfig) {
    this.globalConfig = {
      algorithm: "AES",
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
      key: "default-key",
      ...(config || {}),
    };
  }

  /**
   * 加密数据
   * @param data 要加密的数据
   * @param config 单独自定义加密配置
   * @returns 加密后的数据
   */
  public encrypt(data: any, config: CryptoConfig = {}): string {
    const { key, algorithm, mode, padding } = {
      ...this.globalConfig,
      ...config,
    };
    if (!key) return data;

    const jsonStr = JSON.stringify(data);
    const encryptKey = CryptoJS.enc.Utf8.parse(key);
    const encrypted = CryptoJS[algorithm!].encrypt(jsonStr, encryptKey, {
      mode,
      padding,
    });

    return encrypted.toString();
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据
   * @param config 单独自定义解密配置
   * @returns 解密后的数据
   */
  public decrypt(encryptedData: string, config: CryptoConfig = {}): any {
    const { key, algorithm, mode, padding } = {
      ...this.globalConfig,
      ...config,
    };
    if (!key) return encryptedData;

    try {
      const decryptKey = CryptoJS.enc.Utf8.parse(key);
      const decrypted = CryptoJS[algorithm!].decrypt(
        encryptedData,
        decryptKey,
        {
          mode,
          padding,
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
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }
}
