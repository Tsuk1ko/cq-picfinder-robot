import { retryGet } from '../../utils/retry.mjs';
import { USER_AGENT } from './const.mjs';

export class BiliBiliDynamicFeed {
  constructor() {
    this.updateBaseline = '';
    this.isChecking = false;
  }

  static get enable() {
    const { useFeed, cookie } = global.config.bot.bilibili;
    return !!(useFeed && cookie);
  }

  /**
   * @returns {any[]}
   */
  async getNewDynamic() {
    const {
      data: { data, code, message },
    } = await retryGet('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all', {
      timeout: 10000,
      params: {
        timezone_offset: new Date().getTimezoneOffset(),
        type: 'all',
        update_baseline: this.updateBaseline || undefined,
        page: 1,
        features: 'itemOpusStyle',
      },
      headers: {
        Cookie: global.config.bot.bilibili.cookie,
        'User-Agent': USER_AGENT,
      },
    });

    if (code !== 0) {
      console.error(`[BiliBiliDynamicFeed] getNewDynamic error: (${code})${message}`);
      return [];
    }

    const isFirstFetch = !this.updateBaseline;
    this.updateBaseline = data.update_baseline;
    if (isFirstFetch) return [];

    return data.items.slice(0, data.update_num);
  }

  /**
   * @returns {number}
   */
  async checkUpdateNum() {
    if (this.isChecking) return 0;
    this.isChecking = true;

    try {
      if (!this.updateBaseline) {
        await this.getNewDynamic();
        return 0;
      }

      const {
        data: { data, code, message },
      } = await retryGet('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all/update', {
        timeout: 10000,
        params: {
          type: 'all',
          update_baseline: this.updateBaseline,
        },
        headers: {
          Cookie: global.config.bot.bilibili.cookie,
          'User-Agent': USER_AGENT,
        },
      });

      if (code !== 0) {
        console.error(`[BiliBiliDynamicFeed] checkUpdateNum error: (${code})${message}`);
        return 0;
      }

      return data.update_num;
    } finally {
      this.isChecking = false;
    }
  }
}
