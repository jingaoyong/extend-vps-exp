import puppeteer from 'puppeteer'
import { setTimeout } from 'node:timers/promises'

const args = ['--no-sandbox', '--disable-setuid-sandbox']
if (process.env.PROXY_SERVER) {
    const proxy_url = new URL(process.env.PROXY_SERVER)
    proxy_url.username = ''
    proxy_url.password = ''
    args.push(`--proxy-server=${proxy_url}`.replace(/\/$/, ''))
}

const browser = await puppeteer.launch({
    defaultViewport: { width: 1080, height: 1024 },
    args,
})
const [page] = await browser.pages()
const userAgent = await browser.userAgent()
await page.setUserAgent(userAgent.replace('Headless', ''))
const recorder = await page.screencast({ path: 'recording.webm' })

try {
    if (process.env.PROXY_SERVER) {
        const { username, password } = new URL(process.env.PROXY_SERVER)
        if (username && password) {
            await page.authenticate({ username, password })
        }
    }

    await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/', { waitUntil: 'networkidle2' })
    await page.locator('#memberid').fill(process.env.EMAIL)
    await page.locator('#user_password').fill(process.env.PASSWORD)
    await page.locator('text=ログインする').click()
    await page.waitForNavigation({ waitUntil: 'networkidle2' })
    const expireDate = await page.$eval('tr:has(.freeServerIco) .contract__term', p => p.textContent)
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
    console.log('expireDate', expireDate, 'tomorrow', tomorrow, expireDate === tomorrow)
    // 如果到期日是明天，则准备续期
    if (expireDate === tomorrow) {
        // TODO: 通过电子邮件、Slack 和 Discord 提醒即将到期的通知的
        fetch('https://script.google.com/macros/s/AKfycbzbAcpAe_LGZsXpxjRl9aOV60q-XmuNC_bj62B5G45vR3vB13THNpoqiZr08AjMn_53Ug/exec?recipient=' + process.env.EMAIL)
    }
} catch (e) {
    console.error(e)
} finally {
    await setTimeout(5000)
    await recorder.stop()
    await browser.close()
}
