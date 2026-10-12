"""GGA セレクション（10分）用スライドの下書きをつくる。

中身の出どころは docs/GGAセレクション企画書.html と docs/ペルソナ.md。
仕上げ（言い回し・写真の差し替え）は PowerPoint で本人が行う前提なので、
凝った装飾はせず、1枚1メッセージと画面の大きさを優先する。

使い方: python build_deck.py  →  同じフォルダに MORUNE25143_GGAセレクション_2026-10-12.pptx
"""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

HERE = Path(__file__).parent
IMG = HERE / "img"
OUT = HERE / "MORUNE25143_GGAセレクション_2026-10-12.pptx"

# アプリの画面と同じ色（public/style.css の夜空・金色）にそろえる
NIGHT = RGBColor(0x0B, 0x10, 0x20)
PANEL = RGBColor(0x16, 0x1D, 0x30)
GOLD = RGBColor(0xE2, 0xB8, 0x67)
TEXT = RGBColor(0xF2, 0xEE, 0xE6)
MUTED = RGBColor(0x9A, 0xA3, 0xB5)

SERIF = "游明朝 Demibold"  # 見出し。アプリの明朝に近い字形で、どの Windows にもある
SANS = "メイリオ"          # 本文。python-pptx では ea/latin を明示しないと置き換わる

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]


def set_font(run, size, color=TEXT, bold=False, font=SANS):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    rpr = run._r.get_or_add_rPr()
    for tag in ("a:latin", "a:ea", "a:cs"):
        el = rpr.find(qn(tag))
        if el is None:
            el = rpr.makeelement(qn(tag), {})
            rpr.append(el)
        el.set("typeface", font)


def text(slide, x, y, w, h, lines, size=18, color=TEXT, bold=False, font=SANS,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.25):
    """lines: 文字列、または段落のリスト。段落は文字列か [(文字, {上書き}), ...]"""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05)
    if isinstance(lines, str):
        lines = [lines]
    for i, para in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        runs = [(para, {})] if isinstance(para, str) else para
        for s, opt in runs:
            r = p.add_run()
            r.text = s
            set_font(r, opt.get("size", size), opt.get("color", color),
                     opt.get("bold", bold), opt.get("font", font))
    return box


def panel(slide, x, y, w, h, fill=PANEL, line=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.adjustments[0] = 0.08
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(1.25)
    shp.shadow.inherit = False
    return shp


def picture(slide, name, x, y, h=None, w=None):
    kw = {}
    if h is not None:
        kw["height"] = Inches(h)
    if w is not None:
        kw["width"] = Inches(w)
    return slide.shapes.add_picture(str(IMG / name), Inches(x), Inches(y), **kw)


def new_slide(no, label, title, notes, title_size=30):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = NIGHT
    if no:
        text(s, 0.6, 0.35, 8, 0.4, [[(no + "  ", {"color": GOLD, "bold": True}), (label, {"color": MUTED})]], size=12)
    if title:
        text(s, 0.6, 0.7, 12.1, 1.2, title, size=title_size, font=SERIF)
    s.notes_slide.notes_text_frame.text = notes
    return s



# GGA セレクションの持ち時間10分は「発表＋講評＋入れ替え」。発表は5分強に収める（2026-10-12、説明会の資料から）。
# 最初に出場目的を宣言し、デモを必ず入れる。9枚・約4分45秒＋間で5分（デモ2分02秒。口の説明は最小にして、中身はスライドに任せる）。

def flow_arrow(slide, x, y):
    text(slide, x, y, 0.5, 0.6, "→", size=26, color=GOLD, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


# 0 表紙・出場目的 --------------------------------------------------------------
s = new_slide("", "", "", """【0:00–0:10】
MORUNE 25143の中村です。
今日の出場目的は、起業です。
実装と検証を一緒に進める仲間を探しています。
［送る］""")
text(s, 0.8, 0.9, 7, 0.4, "LEAVE YOUR WISH WITH THE STARS", size=14, color=GOLD, font="Cormorant Garamond")
text(s, 0.8, 1.4, 7.2, 2.4, ["やりたいことを", "星に預けておく"], size=48, font=SERIF, spacing=1.15)
text(s, 0.8, 3.65, 7, 0.6, [[("MORUNE ", {"bold": True}), ("25143", {"color": GOLD, "bold": True})]], size=24)
panel(s, 0.8, 4.6, 7.2, 1.5, line=GOLD)
text(s, 1.1, 4.7, 6.7, 0.45, "出場目的", size=13, color=GOLD, bold=True)
text(s, 1.1, 5.1, 6.7, 0.95, ["起業（スモールビジネス）", "実装と検証を一緒に進める仲間を探しています"], size=18, spacing=1.35)
text(s, 0.8, 6.55, 7, 0.4, "中村 舞衣子　G's ACADEMY 卒業制作", size=12, color=MUTED)
picture(s, "max-home.png", 9.3, 0.35, h=6.8)

# 1 聞いてきた声 -----------------------------------------------------------------
# 流れ（2026-10-13）：支援の場で聞いてきた声 → 意欲の問題ではない（数字は1つ）→ 研究の4条件
# → わたし自身も・だから作った → デモ。数字を増やすと話が制度論に流れるので1つにしぼる。
s = new_slide("01", "Voice", "面談で最も多く聞いてきた悩み", """【0:10–0:40】
私は調査・研究を行うシンクタンクでマーケティングを担当し、副業では働く女性の社外メンターをしています。
面談で最も多く聞いてきたのは、仕事と家庭の両立、つまり時間の制約に関する悩みでした。
［送る］""")
panel(s, 0.6, 1.75, 12.15, 1.0)
text(s, 0.9, 1.75, 3.0, 1.0, "中村 舞衣子", size=24, font=SERIF, anchor=MSO_ANCHOR.MIDDLE)
text(s, 3.7, 1.75, 8.9, 1.0, ["調査・研究を行うシンクタンクでマーケティングを担当", "副業：働く女性の社外メンター ／ 大学院で省察支援を研究（JSET 2026）"],
     size=14, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
text(s, 1.1, 3.4, 11.5, 0.6, "最も多かった悩み", size=16, color=MUTED)
text(s, 1.1, 4.0, 11.5, 1.0, "仕事と家庭の両立　＝　時間の制約", size=36, font=SERIF, color=GOLD)

# 2 意欲を止める、時間の制約 ------------------------------------------------------
s = new_slide("02", "Problem", "意欲を止める、時間の制約", """【0:40–1:00】
聞いたのは、「やりたいことがない」という声ではありません。
「活躍したい」「学び直したい」。でも時間がなく、自信まで失っていく。
MORUNE 25143は、育児や介護、療養などで願いをいったん手放した人が、急かされずに預け、自分のタイミングで受け取り直す体験です。
［送る］""")
voices = [("「活躍したい」\n「学び直したい」", TEXT), ("でも、時間がない", TEXT), ("自信まで\n失っていく", GOLD)]
for i, (h, c) in enumerate(voices):
    x = 0.6 + i * 4.2
    panel(s, x, 1.95, 3.6, 1.7, line=GOLD if i == 2 else None)
    text(s, x + 0.3, 1.95, 3.0, 1.7, h, size=21, font=SERIF, color=c, anchor=MSO_ANCHOR.MIDDLE, spacing=1.3)
    if i < 2:
        flow_arrow(s, x + 3.62, 2.5)
panel(s, 0.6, 4.05, 12.15, 1.85, line=GOLD)
text(s, 0.95, 4.2, 11.5, 0.5, "MORUNE 25143", size=16, color=GOLD, bold=True)
text(s, 0.95, 4.75, 11.5, 1.1, "育児や介護、療養などで願いをいったん手放した人が、\n急かされずに預け、自分のタイミングで受け取り直す体験", size=20, font=SERIF, spacing=1.35)
text(s, 0.6, 6.3, 12.1, 0.6, "参考：6歳未満の子どもがいる世帯の家事関連時間は、1日あたり妻7時間28分・夫1時間54分（総務省「令和3年社会生活基本調査」）", size=11, color=MUTED)

# 3 研究の4つの足場（省察支援・足場かけ） ----------------------------------------------------------------
s = new_slide("03", "Research", "必要なのは強い決意ではなく、小さなきっかけ", """【1:00–1:20】
「いつかやりたい」は、ToDoにすると重荷になります。
大学院で、止まったふりかえりの再開を研究して分かったのは、必要なのは強い決意ではなく、小さなきっかけだということ。
手がかりは小さく、仕組みは軽く、迷ったまま選べて、つながりを感じられる。
この四つを体験の設計にしました。
［送る］""", title_size=27)
conds = [("手がかりは小さく", "最小限の手がかり", "願いは12字だけ"),
         ("仕組みは軽く", "軽量な設計", "預けるだけ。期限も通知もない"),
         ("迷ったまま選べる", "両義性の前提", "受け取る／もう少し預ける／手放す"),
         ("つながりを感じられる", "関係性の中での支援", "みんなの星空・支援の場")]
text(s, 0.6, 1.85, 6.0, 0.4, "省察の再起動を支える設計要件（大学院・JSET 2026）", size=13, color=GOLD, bold=True)
text(s, 7.4, 1.85, 5.0, 0.4, "MORUNE では", size=13, color=GOLD, bold=True)
for i, (h, term, m) in enumerate(conds):
    y = 2.3 + i * 1.08
    panel(s, 0.6, y, 6.1, 0.92)
    text(s, 0.85, y, 3.3, 0.92, h, size=18, font=SERIF, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 4.2, y, 2.4, 0.92, term, size=11, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
    flow_arrow(s, 6.75, y + 0.16)
    panel(s, 7.3, y, 5.45, 0.92, line=GOLD)
    text(s, 7.55, y, 5.0, 0.92, m, size=16, anchor=MSO_ANCHOR.MIDDLE)
text(s, 0.6, 6.7, 12.1, 0.4, "急かさない。比べない。晒さない。", size=15, font=SERIF, color=MUTED)

# 4 はやぶさ（体験の形を選んだ理由） ------------------------------------------------
s = new_slide("04", "Metaphor", "消えた願いではなく、遠い星に預けたもの", """【1:20–1:45】
この体験に重ねたのが、はやぶさの帰還です。
編集長がキャリアブレイクに入り、私が編集長代理を務めた時期に、川口淳一郎先生を取材しました。
「高い塔を建てなければ、新たな水平線は見えてこない」。新しい役割へ踏み出す私を支えた言葉です。
手放した願いを遠い星に預け、カプセルのように一つずつ帰す。これが作品のメタファーです。
（間）
見てください。
［送る・動画を再生］""", title_size=28)
panel(s, 0.6, 1.95, 12.15, 2.0, line=GOLD)
text(s, 1.0, 2.1, 11.4, 1.1, "「高い塔を建てなければ、新たな水平線は見えてこない」", size=30, font=SERIF, color=GOLD)
text(s, 1.0, 3.2, 11.4, 0.6, "川口淳一郎（はやぶさ プロジェクトマネージャー）　前職の編集部で取材", size=14, color=MUTED)
pairs = [("はやぶさ", "7年かけて、小惑星 25143 イトカワから\nカプセルを持ち帰った"), ("MORUNE", "いったん手放した「いつかやりたいこと」を\n星に預け、願いの方から一つずつ帰ってくる")]
for i, (h, b) in enumerate(pairs):
    x = 0.6 + i * 6.35
    panel(s, x, 4.35, 5.8, 2.2)
    text(s, x + 0.35, 4.55, 5.0, 0.6, h, size=22, font=SERIF, color=GOLD)
    text(s, x + 0.35, 5.25, 5.2, 1.2, b, size=15, color=MUTED, spacing=1.5)
    if i == 0:
        flow_arrow(s, x + 5.85, 5.15)
text(s, 0.6, 6.75, 12.1, 0.4, "作品名の 25143 は、イトカワの小惑星番号から", size=12, color=MUTED)

# 5 デモ（2分以上が決まり） -----------------------------------------------------------
# 願いは撮影用の見本。一人称で「わたしの願い」とは言わない（物語の芯を作り話にしない）
s = new_slide("05", "Demo", "デモ：預けて、待って、呼び戻す", """【1:45–3:47】動画 2分02秒。［ ］の時間は動画の中の時間
［0:00］仕事と家のことに追われ、「ギターをもう一度」を打ち消してきた人がいます。ここは、今いる場所、今の時刻の北の空です。
［0:19］願いを書くと、星が灯ります。期限も通知もありません。「今はできなくても、忘れなくていい」と、少し心が軽くなります。
［0:43］余白ができた日に星へ触れると、カプセルが帰ってきます。「まだ、やってみたい」と気づく瞬間です。
［0:58］受け取る、もう少し預ける、手放す。今の自分に合う距離を選べます。
［1:09］受け取ると帰還票になります。書くのは「日程を調べる」など、最初の一歩だけ。
［帰還票とキーホルダーまたはブレスレットを見せる］持ち帰れば、願いを日常で思い出す目印になります。
［1:36］みんなの星空では、内容を見せず、ほかの人の願いを光として感じられます。「立ち止まっているのは自分だけではない」。そのつながりが次の一歩を支えます。
［動画終了後に送る］""")
s.shapes.add_movie(str(HERE / "demo-16x9.mp4"), Inches(1.6), Inches(1.55), Inches(10.1), Inches(5.68),
                   poster_frame_image=str(IMG / "demo-poster.png"), mime_type="video/mp4")
text(s, 1.6, 7.15, 10.1, 0.3, "▶ クリックで再生・2分02秒（このPCの中だけのデータで撮影。見本の願い入り）", size=10, color=MUTED, align=PP_ALIGN.CENTER)

# 6 技術の主体性 ------------------------------------------------------------------
s = new_slide("06", "Technology", "AI に書かせ、何を作るかは自分で決め、数で確かめた", """【3:47–4:02】
コードはAIに書かせ、何を作るかは私が決め、数で確かめました。
位置情報は外へ送らず、オフラインでも動きます。
願いは初めは端末の中だけ。「みんなの星空に出す」と選んだものだけを送り、イトカワまでの距離も計算しています。
［送る］""", title_size=26)
text(s, 0.6, 1.9, 5.8, 0.4, "作ってから、やめたもの", size=14, color=GOLD, bold=True)
quits = [("AI で願いの絵をつくる", "願いのイメージとずれた"), ("星座の線", "意味が伝わらなかった"), ("応援の信号", "シェアとの違いが伝わらなかった"), ("「帰す」ボタン", "触れれば帰る形にした")]
for i, (a, b) in enumerate(quits):
    y = 2.35 + i * 0.85
    panel(s, 0.6, y, 5.8, 0.72)
    text(s, 0.8, y, 2.9, 0.72, a, size=14, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 3.7, y, 2.6, 0.72, b, size=12, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
text(s, 0.6, 5.85, 5.8, 1.0, "本物の星空：5,080個の星を時刻と場所から計算\n自動テスト 238件", size=13, color=MUTED, spacing=1.5)
text(s, 7.0, 1.9, 5.8, 0.4, "数で確かめてから決めた（シミュレーション）", size=14, color=GOLD, bold=True)

def bars(slide, y, label, before, after, unit, maximum):
    text(slide, 7.0, y, 5.8, 0.4, label, size=13)
    for k, (name, value, color) in enumerate([("前", before, MUTED), ("今", after, GOLD)]):
        yy = y + 0.45 + k * 0.5
        text(slide, 7.0, yy, 0.5, 0.4, name, size=12, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
        width = max(0.05, 4.2 * value / maximum)
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.5), Inches(yy + 0.08), Inches(width), Inches(0.26))
        bar.fill.solid(); bar.fill.fore_color.rgb = color; bar.line.fill.background(); bar.shadow.inherit = False
        text(slide, 7.6 + width, yy, 1.6, 0.4, f"{value}{unit}", size=13, color=color, anchor=MSO_ANCHOR.MIDDLE)
bars(s, 2.4, "星が重なる日（1年あたり、まとめて預ける人）", 363, 0, "日", 365)
bars(s, 3.95, "同じ願いが続けて帰る確率（候補が2つのとき）", 50, 0, "%", 100)
text(s, 7.0, 5.5, 5.8, 1.3, "旧：番号で星の場所を決め、上限30個\n今：空いている席に置き、上限19個（北の星座3つの星の数）", size=12, color=MUTED, spacing=1.5)

# 7 届け方と仕組み ----------------------------------------------------------------
s = new_slide("07", "Distribution", "個人は無料。導入と、日常へつなぐ目印の物販で続ける", """【4:02–4:17】
入口は、展示とキャリア・復職支援の場です。
個人利用は無料。クライアントへの導入と、イベントでの帰還票、キーホルダー、ブレスレットの物販で続けます。
これらは、デジタルの願いを日常へつなぐ目印です。
［送る］""", title_size=28)
road = [("展示・支援の場", "科学館・宇宙イベント\nキャリア・復職の支援の場\nQR から預ける\n帰還票をその場で印刷"),
        ("紙と物", "帰還票・ブレスレット\n最初の一歩が目に入る\nQR から自分の星へ"),
        ("アプリ", "やりたくなったら\n星に触れて呼び戻す")]
for i, (h, b) in enumerate(road):
    x = 0.6 + i * 4.2
    panel(s, x, 1.95, 3.6, 2.65, line=GOLD if i == 0 else None)
    text(s, x + 0.3, 2.15, 3.0, 0.6, h, size=22, font=SERIF, color=GOLD)
    text(s, x + 0.3, 2.85, 3.0, 1.7, b, size=14, color=MUTED, spacing=1.5)
    if i < 2:
        flow_arrow(s, x + 3.62, 2.95)
text(s, 0.6, 4.95, 12.2, 0.4, "個人利用は無料。クライアントへの導入と物販で続ける", size=16, font=SERIF)
money = [("場への導入", "科学館・自治体・支援の場に\n体験一式を期間で"), ("持ち帰る物", "帰還票・キーホルダー・ブレスレット\nイベントで物販"), ("共創", "アーティストと、帰還票の絵柄・会場の演出")]
for i, (h, b) in enumerate(money):
    x = 0.6 + i * 4.2
    panel(s, x, 5.5, 3.95, 1.35)
    text(s, x + 0.25, 5.6, 3.5, 0.45, h, size=15, color=GOLD, bold=True)
    text(s, x + 0.25, 6.05, 3.6, 0.8, b, size=12, color=MUTED)

# 8 Ask -----------------------------------------------------------------------
s = new_slide("08", "Ask", "やりたかったことを、置き去りにしない", """【4:17–4:50】
この作品を作る途中で、私も立ち止まる側になりました。
（間）
だからこれは、願いを急かさず、「もう一度」と思えた日に返す仕組みです。
まず、展示と支援の場で検証します。
展示の機会、検証の場、実装を共にする仲間を探しています。
QRから、願いを一つ預けられます。
ありがとうございました。""")
asks = [("展示の機会", "科学館・プラネタリウム・自治体のイベント"),
        ("検証の場", "キャリアや復職を支える人事・支援者のもとで試す"),
        ("実装の仲間", "実装と検証を一緒に進めるエンジニア")]
for i, (h, b) in enumerate(asks):
    y = 1.95 + i * 1.2
    panel(s, 0.6, y, 8.2, 0.88, line=GOLD if i == 0 else None)
    text(s, 0.9, y, 2.3, 0.88, h, size=19, font=SERIF, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 3.2, y, 5.4, 0.88, b, size=14, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
text(s, 0.6, 6.15, 8.2, 0.8, "わかっていること：公開2日で、端末12台ほどが願いを預けた（人数ではない）。\nこれから展示と支援の場で、持ち帰った人と、また開いた人を数えて検証する", size=12, color=MUTED)
panel(s, 9.4, 1.95, 3.4, 4.6, fill=RGBColor(0xFF, 0xFF, 0xFF))
picture(s, "qr-site.png", 9.65, 2.15, w=2.9)
text(s, 9.4, 5.15, 3.4, 1.3, ["いま、ひとつ預けられます", "morune-25143.morune-25143.workers.dev"], size=11, color=NIGHT, align=PP_ALIGN.CENTER)

prs.save(OUT)
print("saved", OUT)
