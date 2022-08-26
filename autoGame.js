const NAGETIVE_DIRECTION = {
    "U": "D",
    "L": "R",
    "D": "U",
    "R": "L",
};
const COLUMN = 6;
const OBSTACLE = 6;
const { cookie, uid, DING_TALK_TOKEN, PUSH_PLUS_TOKEN } = require("./config");
const { Game } = require("./Game");
const got = require('got')
const PUSH_URL = 'http://www.pushplus.plus/send' // pushplus 推送api
const DINGTALK_PUSH_URL = "https://oapi.dingtalk.com/robot/send?access_token=" + DING_TALK_TOKEN; // 钉钉webhook
/**
 * @desc 一维数组转二维数组
 * @param {Array} arr 原数据
 * @param {Number} num 每个维度的元素数量
 */
function ArrayOneToTwo(arr, num) {
    let arrList = [];
    arr.map((item, index) => {
        if (index % num == 0) {
            arrList.push([item]);
        } else {
            arrList[arrList.length - 1].push(item);
        }
    });
    return arrList;
}

/**
 * @desc 计算行走轨迹
 * @param {Array} maps 地图
 */
const getTarck = (maps) => {
    const mapsTrack = [
        [3, 1, "U"],
        [2, 2, "L"],
        [4, 2, "D"],
        [3, 3, "R"],
    ];
    const mapsTree = ArrayOneToTwo(maps, COLUMN);

    // 过滤掉有障碍物的位置
    const trackXY = mapsTrack.filter((item) => {
        const xy = mapsTree[item[0]][item[1]];
        return xy !== OBSTACLE;
    });

    // 移动后反方向移动回初始位置
    const trackList = trackXY.map((item) => {
        return [item[2], NAGETIVE_DIRECTION[item[2]]];
    }).flat();
    return trackList;
};

let runNum = 0;
const autoGame = async () => {
    runNum++;
    if (runNum > 500) return ; // 防止死循环
    let exp = new Game(uid, cookie);
    let gameData = await exp.openGame();
    console.log(gameData !== undefined ? "Game Start🎮" : "Game Start Error❌");
    if (!gameData) return;

    const { mapData } = gameData;
    const track = getTarck(mapData);
    exp.move(track).then(() => {
        exp.outGame().then(async (res) => {
            res.body = JSON.parse(res.body);
            console.log(
                `Game over, Reward: ${res.body.data.realDiamond}, Today reward: ${res.body.data.todayDiamond}, Today limit reward: ${res.body.data.todayLimitDiamond}`
            );
    
            if (res.body.data.realDiamond < 40) {
                // 奖励小于40刷新下地图
                await exp.freshMap();
            }
            // 没达到今日上限继续自动游戏
            if (res.body.data.todayDiamond < res.body.data.todayLimitDiamond) {
                setTimeout(() => {
                    autoGame();
                }, 1000);
            } else {
                handlePush("今日挖矿🎮奖励已达上限:"+res.body.data.todayLimitDiamond)
            }
        });
    });
};
// push
async function handlePush (desp) {
    const url = DING_TALK_TOKEN == '' ? PUSH_URL : DINGTALK_PUSH_URL;
    const body = DING_TALK_TOKEN == '' ? {
      token: `${PUSH_PLUS_TOKEN}`,
      title: `签到结果`,
      content: `${desp}`
    } : {
      msgtype: "text",
      text: { content: "签到结果: " + desp },
    };
    
    let param = {
      json: body,
    };
    if (DING_TALK_TOKEN != '') {
      param.hooks = {
          beforeRequest: [
              (options) => {
                  Object.assign(options.headers, HEADERS_DINGTALK_WEB_HOOK);
              },
          ],
      }
    }
    const res = await got.post(url, param);
    console.log(res.body);
  }

exports.autoGame = autoGame;