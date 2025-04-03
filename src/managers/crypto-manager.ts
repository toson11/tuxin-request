import * as CryptoJS from "crypto-js";
import { CryptoConfig } from "@/types";
import { getValueByPath, setValueByPath } from "@/core/utils";
import { ERROR_KEY } from "@/core/constants";

type Config = Exclude<CryptoConfig, boolean>;
export class CryptoManager {
  private globalConfig: Config = {
    algorithm: "AES",
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
    key: "default-key",
  };

  constructor(config?: Config) {
    this.updateConfig(config);
  }

  /**
   * 加密数据
   * @param data 要加密的数据
   * @param config 单独自定义加密配置
   * @returns 加密后的数据
   */
  public encrypt(data: any, config: NonNullable<Config> = {}): string {
    if (!data) return data;
    try {
      const {
        key = this.globalConfig.key,
        algorithm = this.globalConfig.algorithm,
        mode = this.globalConfig.mode,
        padding = this.globalConfig.padding,
      } = config;
      const jsonStr = JSON.stringify(data);
      const encryptKey = CryptoJS.enc.Utf8.parse(key!);
      const encrypted = CryptoJS[algorithm!].encrypt(jsonStr, encryptKey, {
        mode,
        padding,
      });

      return encrypted.toString();
    } catch (error) {
      throw new Error(`${ERROR_KEY.ENCRYPT}: 加密失败, ${error}`);
    }
  }

  /**
   * 加密数据
   * @param data 要加密的数据
   * @param config 单独自定义加密配置
   * @returns 加密后的数据
   */
  public encryptFields(data: any, config: Config = {}): string {
    if (!data) return data;
    const fields = config.fields || this.globalConfig.fields;

    if (!fields?.length) {
      return this.encrypt(data, config);
    }

    const result = JSON.parse(JSON.stringify(data));
    fields.forEach((field) => {
      const value = getValueByPath(result, field);
      if (!value) return;
      const encrypted = this.encrypt(value, config);
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
      key = this.globalConfig.key,
      algorithm = this.globalConfig.algorithm,
      mode = this.globalConfig.mode,
      padding = this.globalConfig.padding,
    } = config;
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
      throw new Error(`${ERROR_KEY.ENCRYPT}: 解密失败, ${error}`);
    }
  }

  /**
   * 更新配置
   * @param config 新的配置
   */
  public updateConfig(config?: Partial<Config>): void {
    if (config) {
      const { algorithm, mode, padding, key } = config;
      if (algorithm) this.globalConfig.algorithm = algorithm;
      if (mode) this.globalConfig.mode = mode;
      if (padding) this.globalConfig.padding = padding;
      if (key) this.globalConfig.key = key;
    }
  }
}
