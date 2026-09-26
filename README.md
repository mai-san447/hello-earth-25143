# 25143 — HELLO EARTH

HACK SONIC 2026秋「宇宙をHACKせよ」提出作。

小惑星25143イトカワから地球へ戻ったサンプルリターンを手がかりに、いまの願いを声で未来へ預け、帰還した声として聴き直すWeb体験です。

## 体験
1. 「帰ってきたら、したいこと」を書く
2. 30秒以内で声を録音する
3. スマホを振って、帰還カプセルを呼ぶ
4. 未来から戻った自分の声を聴く

端末の動きを利用できない環境では「落とす」ボタンで同じ体験を完了できます。

## 技術
- HTML / CSS / JavaScript（依存なし）
- MediaRecorder API によるブラウザ内録音
- DeviceMotion API によるシェイク操作
- 録音データは外部送信・保存しない

## 公開版
- https://hello-earth-25143.maiko2223.chatgpt.site

## ローカルで開く
`index.html` をChromeまたはSafariで開いてください。録音にはマイク許可が必要です。

## 制作
- Team: HELLO EARTH
- Concept / Direction: EMKO
