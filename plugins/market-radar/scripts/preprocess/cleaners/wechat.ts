/**
 * WeChat official account cleaner
 *
 * Applies only to wechat source
 */

import { Cleaner } from './types';

export const wechatCleaner: Cleaner = {
  name: 'wechat',
  priority: 300,
  scope: 'specific',
  sources: ['wechat'],

  clean(content: string): string {
    let result = content;

    // W1: Remove QR code related text
    result = result.replace(/长按识别[^\n]*二维码[^\n]*/g, '');
    result = result.replace(/扫码关注[^\n]*/g, '');
    result = result.replace(/点击关注[^\n]*/g, '');

    // W2: Remove bottom action text
    result = result.replace(/^阅读原文\s*$/gm, '');
    result = result.replace(/^点赞\s*$/gm, '');
    result = result.replace(/^在看\s*$/gm, '');
    result = result.replace(/^写留言\s*$/gm, '');

    // W3: Remove WeChat images (preserve alt text)
    result = result.replace(
      /!\[([^\]]*)\]\([^)]*mmbiz\.(qpic|qlogo)\.cn[^)]*\)/g,
      (match, alt) => alt || ''
    );

    // W4: Remove official account card
    result = result.replace(/公众号名片[^\n]*/g, '');

    return result;
  },
};
