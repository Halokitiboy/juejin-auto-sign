'use strict';

const got = require('got');

const {
  autoGame
} = require('./autoGame');

const {
  cookie,
  aid,
  uuid,
  _signature,
  PUSH_PLUS_TOKEN,
  DING_TALK_TOKEN,
  uid
} = require('./config');

const BASEURL = 'https://api.juejin.cn/growth_api/v1/check_in'; // 掘金签到api

const PUSH_URL = 'http://www.pushplus.plus/send'; // pushplus 推送api

const DINGTALK_PUSH_URL = "https://oapi.dingtalk.com/robot/send?access_token=" + DING_TALK_TOKEN; // 钉钉webhook

const URL = `${BASEURL}?aid=${aid}&uuid=${uuid}&_signature=${_signature}`;
const DRAW_URL = `https://api.juejin.cn/growth_api/v1/lottery/draw?aid=${aid}&uuid=${uuid}&_signature=${_signature}`;
const LUCKY_URL = `https://api.juejin.cn/growth_api/v1/lottery_lucky/dip_lucky?aid=${aid}&uuid=${uuid}`;
const DRAW_CHECK_URL = `https://api.juejin.cn/growth_api/v1/lottery_config/get?aid=${aid}&uuid=${uuid}`;
const UA_LIST = ['Mozilla/5.0 (compatible; U; ABrowse 0.6; Syllable) AppleWebKit/420+ (KHTML, like Gecko)', 'Mozilla/5.0 (compatible; U; ABrowse 0.6;  Syllable) AppleWebKit/420+ (KHTML, like Gecko)', 'Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser 1.98.744; .NET CLR 3.5.30729)', 'Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser 1.98.744; .NET CLR   3.5.30729)', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.67', 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0;   Acoo Browser; GTB5; Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1;   SV1) ; InfoPath.1; .NET CLR 3.5.30729; .NET CLR 3.0.30618)', 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; SV1; Acoo Browser; .NET CLR 2.0.50727; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729; Avant Browser)', 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Acoo Browser; SLCC1;   .NET CLR 2.0.50727; Media Center PC 5.0; .NET CLR 3.0.04506)', 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Acoo Browser; GTB5; Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1) ; Maxthon; InfoPath.1; .NET CLR 3.5.30729; .NET CLR 3.0.30618)', 'Mozilla/4.0 (compatible; Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser 1.98.744; .NET CLR 3.5.30729); Windows NT 5.1; Trident/4.0)', 'Mozilla/4.0 (compatible; Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; GTB6; Acoo Browser; .NET CLR 1.1.4322; .NET CLR 2.0.50727); Windows NT 5.1; Trident/4.0; Maxthon; .NET CLR 2.0.50727; .NET CLR 1.1.4322; InfoPath.2)', 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser; GTB6; Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1) ; InfoPath.1; .NET CLR 3.5.30729; .NET CLR 3.0.30618)'];
const HEADERS = {
  cookie,
  'user-agent': UA_LIST[Math.floor(Math.random() * 10)]
};
const HEADERS_DINGTALK_WEB_HOOK = {
  "Content-Type": "application/json"
}; // 签到

async function signIn() {
  const res = await got.post(URL, {
    hooks: {
      beforeRequest: [options => {
        Object.assign(options.headers, HEADERS);
      }]
    }
  });
  const drawData = await got.get(DRAW_CHECK_URL, {
    hooks: {
      beforeRequest: [options => {
        Object.assign(options.headers, HEADERS);
      }]
    }
  });
  let drawText = '';

  if (JSON.parse(drawData.body).data.free_count > 0) {
    // 免费次数大于0时再抽
    drawText = draw();
  }
  lucky();

  if (PUSH_PLUS_TOKEN || DING_TALK_TOKEN) {
    if (typeof res.body == "string") res.body = JSON.parse(res.body);
    const msg = res.body.err_no == 0 ? `成功，获得${res.body.data.incr_point}个矿石，矿石总数：${res.body.data.sum_point}个。` : "失败，" + res.body.err_msg;
    handlePush(`${msg},${drawText}`);
  }

  if (!uid) return;
  autoGame();
}

async function draw() {
  const res = await got.post(DRAW_URL, {
    hooks: {
      beforeRequest: [options => {
        Object.assign(options.headers, HEADERS);
      }]
    }
  });
  let {
    err_msg,
    data,
    err_no
  } = JSON.parse(res.body);
  let desp = '';

  if (err_no !== 0) {
    desp = err_msg;
  } else {
    let {
      lottery_name
    } = data;
    desp = `掘金免费抽奖成功：今日获得${lottery_name}`;
  }

  return desp;
}
/**
 * @desc 沾喜气
 */


async function lucky() {
  const res = await got.post(LUCKY_URL, {
    hooks: {
      beforeRequest: [options => {
        Object.assign(options.headers, HEADERS);
      }]
    }
  });
  console.log(res.body);
} // push


async function handlePush(desp) {
  const url = DING_TALK_TOKEN == '' ? PUSH_URL : DINGTALK_PUSH_URL;
  const body = DING_TALK_TOKEN == '' ? {
    token: `${PUSH_PLUS_TOKEN}`,
    title: `签到结果`,
    content: `${desp}`
  } : {
    msgtype: "text",
    text: {
      content: "签到结果: " + desp
    }
  };
  let param = {
    json: body
  };

  if (DING_TALK_TOKEN != '') {
    param.hooks = {
      beforeRequest: [options => {
        Object.assign(options.headers, HEADERS_DINGTALK_WEB_HOOK);
      }]
    };
  }

  const res = await got.post(url, param);
  console.log(res.body);
}

signIn();
