import CryptoJS from "crypto-js";
import { CryptoConfig as Config } from "@/types";
import { getValueByPath, setValueByPath } from "@/core/utils";
import { ERROR_MESSAGE_KEY } from "@/core/constants";

const DEFAULT_CONFIG: Required<Omit<Config, "fields">> = {
  algorithm: "AES",
  mode: CryptoJS.mode.ECB,
  padding: CryptoJS.pad.Pkcs7,
  key: "default-key",
};
export class CryptoManager {
  private defaultConfig: Config = DEFAULT_CONFIG;
  // 构造函数，用于初始化对象
  constructor(config?: Config) {
    this.updateDefaultConfig(config);
  }

  /**
   * 加密数据
   * @param data 要加密的数据
   * @param config 单独自定义加密配置
   * @returns 加密后的数据
   */
  private encryptData(data: any, config: Config): string {
    if (!data) return data;
    try {
      const {
        key = DEFAULT_CONFIG.key,
        algorithm = DEFAULT_CONFIG.algorithm,
        mode = DEFAULT_CONFIG.mode,
        padding = DEFAULT_CONFIG.padding,
      } = config;
      if (!CryptoJS[algorithm]) {
        throw new Error(
          `${ERROR_MESSAGE_KEY.ENCRYPT}: 加密算法 ${algorithm} 不存在`
        );
      }

      const jsonStr = JSON.stringify(data);
      const encryptKey = CryptoJS.enc.Utf8.parse(key);

      const encrypted = CryptoJS[algorithm].encrypt(jsonStr, encryptKey, {
        mode,
        padding,
      });

      return encrypted.toString();
    } catch (error) {
      throw new Error(`${ERROR_MESSAGE_KEY.ENCRYPT}: 加密失败, ${error}`);
    }
  }

  /**
   * 加密数据
   * @param data 要加密的数据
   * @param config 单独自定义加密配置
   * @returns 加密后的数据
   */
  public encrypt(data: any, _config: Config = {}): string {
    if (!data) return data;
    const { fields, ...encryptConfig } = { ...this.defaultConfig, ..._config };
    if (!fields?.length) {
      return this.encryptData(data, encryptConfig);
    }

    const result = JSON.parse(JSON.stringify(data));
    fields.forEach((field) => {
      const value = getValueByPath(result, field);
      if (!value) return;
      const encrypted = this.encryptData(value, encryptConfig);
      setValueByPath(result, field, encrypted);
    });

    return result;
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据
   * @param config 单独自定义解密配置
   * @returns 解密后的数据
   */
  public decrypt(encryptedData: string, config: Config = {}): any {
    const {
      key = DEFAULT_CONFIG.key,
      algorithm = DEFAULT_CONFIG.algorithm,
      mode = DEFAULT_CONFIG.mode,
      padding = DEFAULT_CONFIG.padding,
    } = { ...this.defaultConfig, ...config };

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
      throw new Error(`${ERROR_MESSAGE_KEY.ENCRYPT}: 解密失败, ${error}`);
    }
  }

  public updateDefaultConfig(config?: Partial<Config>): void {
    if (!config) return;
    // 注意：此处不能使用深拷贝，否则会导致加密算法无法正常使用
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}
