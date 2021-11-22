import { get } from 'axios';
import CQ from '../../CQcode';
import logError from '../../logError';

const parseDynamicCard = ({
  card,
  desc: {
    type,
    dynamic_id_str,
    bvid,
    origin,
    user_profile: {
      info: { uname },
    },
  },
}) => ({
  dyid: dynamic_id_str,
  type,
  uname,
  origin,
  card: { bvid, ...JSON.parse(card) },
});

const dynamicCard2msg = async (card, forPush = false) => {
  const {
    dyid,
    type,
    uname,
    origin,
    card: { item, bvid, dynamic, pic, title, id, summary, image_urls },
  } = parseDynamicCard(card);
  const lines = [`https://t.bilibili.com/${dyid}`, `UP：${uname}`, ''];
  switch (type) {
    // 图文动态
    case 2:
      const { description, pictures } = item;
      lines.push(description.trim());
      for (const { img_src } of pictures) {
        lines.push(await CQ.imgPreDl(img_src));
      }
      break;

    // 转发
    case 1:
      if (forPush && item.content.includes('详情请点击互动抽奖查看')) return null;

    // 文字动态 eslint-disable-next-line no-fallthrough
    case 4:
      const { content } = item;
      lines.push(content.trim());
      if (type === 1 && origin) lines.push(`https://t.bilibili.com/${origin.dynamic_id_str}`);
      break;

    // 视频
    case 8:
      lines.push(dynamic.trim());
      lines.push(CQ.img(pic));
      lines.push(title.trim());
      lines.push(`https://www.bilibili.com/video/${bvid}`);
      break;

    // 文章
    case 64:
      if (image_urls.length) lines.push(CQ.img(image_urls[0]));
      lines.push(title.trim(), summary.trim());
      lines.push(`https://www.bilibili.com/read/cv${id}`);
      break;

    // 未知
    default:
      lines.push(`未知的动态类型 type=${type}`);
  }
  return lines.join('\n').trim();
};

export const getDynamicInfo = async id => {
  try {
    const {
      data: { data },
    } = await get(`https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail?dynamic_id=${id}`);
    return dynamicCard2msg(data.card);
  } catch (e) {
    logError(`${global.getTime()} [error] bilibili get dynamic info ${id}`);
    logError(e);
    return null;
  }
};

export const getUserDynamicsInfo = async (uid, afterTs) => {
  try {
    const {
      data: { data },
    } = await get(`https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?host_uid=${uid}`);
    return (
      await Promise.all(
        data.cards
          .filter(({ desc: { timestamp } }) => timestamp * 1000 > afterTs)
          .map(card => dynamicCard2msg(card, true))
      )
    ).filter(Boolean);
  } catch (e) {
    logError(`${global.getTime()} [error] bilibili get user dynamics info ${uid}`);
    logError(e);
    return null;
  }
};
