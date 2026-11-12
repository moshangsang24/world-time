import { DateTime } from 'luxon';

/**
 * 通用格式化工具类
 */
export class Formatters {
  /**
   * 格式化数字，添加千位分隔符
   */
  static formatNumber(
    value: number,
    options: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
      locale?: string;
    } = {}
  ): string {
    const { minimumFractionDigits = 0, maximumFractionDigits = 2, locale = 'zh-CN' } = options;
    
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  }

  /**
   * 格式化百分比
   */
  static formatPercentage(value: number, decimals = 1): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天 ${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 格式化相对时间（如"3分钟前"）
   */
  static formatRelativeTime(dateTime: DateTime, locale = 'zh'): string {
    return dateTime.toRelative({ locale }) || '';
  }

  /**
   * 格式化坐标
   */
  static formatCoordinate(
    value: number,
    type: 'latitude' | 'longitude',
    precision = 4
  ): string {
    const abs = Math.abs(value);
    const direction = type === 'latitude' 
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W');
    
    return `${abs.toFixed(precision)}° ${direction}`;
  }

  /**
   * 格式化坐标对
   */
  static formatCoordinates(latitude: number, longitude: number, precision = 4): string {
    return `${this.formatCoordinate(latitude, 'latitude', precision)}, ${this.formatCoordinate(longitude, 'longitude', precision)}`;
  }

  /**
   * 截断文本并添加省略号
   */
  static truncateText(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 首字母大写
   */
  static capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * 驼峰命名转换为短横线命名
   */
  static camelToKebab(text: string): string {
    return text.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * 短横线命名转换为驼峰命名
   */
  static kebabToCamel(text: string): string {
    return text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

/**
 * 国际化格式化工具
 */
export class I18nFormatters {
  /**
   * 获取城市名称（根据语言）
   */
  static getCityName(city: { name: string; nameEn: string }, locale = 'zh'): string {
    return locale === 'zh' ? city.name : city.nameEn;
  }

  /**
   * 格式化日期（本地化）
   */
  static formatDate(dateTime: DateTime, locale = 'zh', options: Intl.DateTimeFormatOptions = {}): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    const intlLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    
    return new Intl.DateTimeFormat(intlLocale, formatOptions).format(dateTime.toJSDate());
  }

  /**
   * 格式化时间（本地化）
   */
  static formatTime(
    dateTime: DateTime,
    locale = 'zh',
    format: '12h' | '24h' = '24h',
    showSeconds = true
  ): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: format === '12h',
    };

    if (showSeconds) {
      options.second = '2-digit';
    }

    const intlLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    return new Intl.DateTimeFormat(intlLocale, options).format(dateTime.toJSDate());
  }

  /**
   * 格式化星期几
   */
  static formatWeekday(dateTime: DateTime, locale = 'zh'): string {
    const intlLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    return new Intl.DateTimeFormat(intlLocale, { weekday: 'long' }).format(dateTime.toJSDate());
  }

  /**
   * 格式化月份
   */
  static formatMonth(dateTime: DateTime, locale = 'zh'): string {
    const intlLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    return new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(dateTime.toJSDate());
  }
}

/**
 * 验证工具类
 */
export class Validators {
  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证URL格式
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证是否为数字
   */
  static isNumeric(value: any): boolean {
    return !isNaN(value) && !isNaN(parseFloat(value));
  }

  /**
   * 验证字符串长度
   */
  static isValidLength(text: string, min: number, max: number): boolean {
    return text.length >= min && text.length <= max;
  }

  /**
   * 验证是否包含特殊字符
   */
  static hasSpecialCharacters(text: string): boolean {
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return specialCharRegex.test(text);
  }

  /**
   * 验证坐标范围
   */
  static isValidLatitude(lat: number): boolean {
    return lat >= -90 && lat <= 90;
  }

  static isValidLongitude(lng: number): boolean {
    return lng >= -180 && lng <= 180;
  }
}