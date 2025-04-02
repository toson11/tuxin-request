import CryptoJS from "crypto-js";
import { CryptoConfig } from "@/types";

type Config = Exclude<CryptoConfig, boolean>;
export class CryptoManager {
  private globalConfig: Config;

  constructor(config?: Config) {
    this.globalConfig = {
      algorithm: "AES",
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
      key: "default-key",
      ...config,
    };
  }

  /**
   * 加密数据
   * @param data 要加密的数据
   * @param config 单独自定义加密配置
   * @returns 加密后的数据
   */
  public encrypt(data: any, config: Config = {}): string {
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
  public decrypt(encryptedData: string, config: Config = {}): any {
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
  public updateConfig(config: Partial<Config>): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }
}
