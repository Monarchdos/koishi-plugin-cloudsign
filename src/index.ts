/*
 * @Name: Cloudsign
 * @Author: Monarchdos@monarchdosw@gmail.com
 * @Date: 2024-09-18 13:00:18
 * @LastEditTime: 2024-09-19 14:43:17
 */
import { Context, Schema, h } from 'koishi'

export const name = 'cloudsign'

export interface Config {
  cloudsign_key: string
  cloudsign_master: string
  cloudsign_reply_quote: boolean
}

export const Config: Schema<Config> = Schema.object({
  cloudsign_key: Schema.string().default('null').description('Key'),
  cloudsign_master: Schema.string().default('').description('主人QQ'),
  cloudsign_reply_quote: Schema.boolean().default(true).description('是否在回复时引用用户消息')
})

const core = '68747470733a2f2f636c6f75647369676e2e61796672652e636f6d2f'
function getAtUsers(elements: h[]) {
  return elements
    .filter(el => el.type === 'at')
    .map(el => el.attrs.id)
}

export function apply(ctx: Context, config: Config) {
  ctx.middleware(async (session, next) => {
    const regex = /^签到$|^积分$|^(挖矿|我的背包|钓鱼|我的鱼篓)$|^(出售|售出) ([\u4e00-\u9fa5]+)$|^功能(?: (.*?))?$|^领取积分补助$|^签到状态$|^排行榜$|^打劫(.*?)$|^抽奖 (\d+)$|^转账 (\d+)(.*?)$|^@检查更新@$|^#(.*?)$|^猜拳(石头|剪刀|布) (\d+)$|^(猜数字|我猜) (\d+)$/;
    if (!regex.test(session.content) || !session.guildId || !/^\d+$/.test(session.guildId) || !['qq', 'onebot'].includes(session.platform)) return next();
    const s = session.content.trim().replace(/<at[^>]*>/g, '');;
    const username = session.username
    const atUsers = getAtUsers(session.elements);
    const ats = atUsers[0] || session.userId;
    if (s.length > 33 || s.trim().replace(/#/g, '') === '') return;

    const version = '1.0.0';

    const params = new URLSearchParams({
      command: s,
      at: String(ats),
      qq: String(session.userId),
      qun: String(session.guildId),
      botqq: String(session.selfId),
      username: username,
      version: version,
      platform: 'koishi',
      token: String(Math.floor(Date.now() / 1000)),
      key: config.cloudsign_key || '',
      master: config.cloudsign_master || ''
    });

    try { 
      // Simulated requests may ban the IP
      let res = await ctx.http.post(Buffer.from(core, 'hex').toString(), params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (res.includes('wwwroot') || res.includes('html') || res.length === 1 || res.trim() === '') return;
      res = res.replace(/\[CQ:image,file=(.+?)\]/, (match, p1) => {
        return h('message', h('img', { src: p1 }));
      });
      await session.send((config.cloudsign_reply_quote ? h('quote', { id: session.messageId }) : '') + res);
    } catch (error) {
      ctx.logger('cloudsign').warn('Server connection failed.');
    }
  });
}
