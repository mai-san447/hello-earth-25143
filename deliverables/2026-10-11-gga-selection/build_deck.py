"""GGA セレクション（10分）用スライドの下書きをつくる。

中身の出どころは docs/GGAセレクション企画書.html と docs/ペルソナ.md。
仕上げ（言い回し・写真の差し替え）は PowerPoint で本人が行う前提なので、
凝った装飾はせず、1枚1メッセージと画面の大きさを優先する。

使い方: python build_deck.py  →  同じフォルダに MORUNE25143_GGAセレクション_2026-10-11.pptx
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
OUT = HERE / "MORUNE25143_GGAセレクション_2026-10-11.pptx"

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


# 0 表紙 ---------------------------------------------------------------------
s = new_slide("", "", "", """【0:00–0:20】
MORUNE 25143 です。やりたいことを、星に預けておく作品です。
今日の出場の目的は、この体験を展示として届ける仲間を探すことです。""")
text(s, 0.8, 1.2, 7, 0.4, "LEAVE YOUR WISH WITH THE STARS", size=14, color=GOLD, font="Cormorant Garamond")
text(s, 0.8, 1.7, 7, 2.4, ["やりたいことを", "星に預けておく"], size=48, font=SERIF, spacing=1.15)
text(s, 0.8, 3.9, 7, 0.5, "預けた願いは　いつか帰ってくる", size=18, color=MUTED)
text(s, 0.8, 5.0, 7, 0.6, [[("MORUNE ", {"bold": True}), ("25143", {"color": GOLD, "bold": True})]], size=26)
panel(s, 0.8, 5.8, 7.0, 0.8, line=GOLD)
text(s, 1.0, 5.85, 6.6, 0.7, "出場の目的：この体験を、展示として届ける仲間を探しています", size=16, anchor=MSO_ANCHOR.MIDDLE)
text(s, 0.8, 6.85, 7, 0.4, "中村 舞衣子　G's ACADEMY 卒業制作", size=12, color=MUTED)
picture(s, "01-home.png", 9.3, 0.4, h=6.7)

# 1 Why me -------------------------------------------------------------------
s = new_slide("01", "Why me", "なぜ、わたしが願いを宇宙に預けるのか", """【0:20–1:50】
・前職で、はやぶさのプロジェクトマネージャー、川口淳一郎教授を取材しました。「高い塔を建てなければ、新たな水平線は見えてこない」。
・はやぶさは7年かけて、小惑星 25143 イトカワから地球へ帰ってきました。作品名の 25143 はこの番号です。
・わたし自身、やりたいことを手放さなければならない時期がありました。手放すときは消えてしまう気がして、戻ったときは多すぎて選べなかった。
　（どこまで話すかは本人が決める。病名などは場によって）
・大学院では 1on1 のふりかえりを研究し、過去の自分の言葉に出会い直すと、次の一歩を選びやすくなると学びました。""")
cards = [
    ("原点", "はやぶさを取材した", "「高い塔を建てなければ、新たな水平線は見えてこない」\n\nはやぶさは7年かけて、小惑星 25143 イトカワから帰ってきた。作品名はこの番号から"),
    ("体験", "やりたいことを\n一度手放した", "手放すときは\n「消えてしまう気がする」\n\n戻ったときは\n「多すぎて選べない」"),
    ("研究", "過去の自分の言葉に\n出会い直す", "大学院で 1on1 のふりかえりを研究した。過去の自分の言葉に出会い直すと、次の一歩を選びやすくなる\n（JSET 2026 で発表）"),
]
for i, (k, h, b) in enumerate(cards):
    x = 0.6 + i * 4.1
    panel(s, x, 2.0, 3.8, 4.8)
    text(s, x + 0.3, 2.2, 3.2, 0.4, k, size=13, color=GOLD, bold=True)
    text(s, x + 0.3, 2.65, 3.3, 0.9, h, size=20, font=SERIF)
    text(s, x + 0.3, 3.75, 3.25, 3.0, b, size=14, color=MUTED, spacing=1.35)

# 2 ペルソナと課題 -------------------------------------------------------------
s = new_slide("02", "Problem", "自分を後回しにする期間の「いつか」は、置き場所がないまま消えていく", """【1:50–2:30】※10分版のみ。5分版では1文に縮める
・最初に届けたいのは、療養や休職で、しばらく仕事を離れる人です。仮の人物として、みわさん42歳。
・休みに入る前の晩、天文台で土星を見たいと思う。でも今言うことではない気がして、どこにも書かない。
・置き場所がない。戻ったときに思い出せない、選べない。だれにも言わないので、応援もされない。
・入口はだれでも。育休・介護・忙しい時期の人にも同じことが起きます。
・生活や目標のアプリは100日以内に約7割が使われなくなる。続けさせる仕組みではなく、待っていられる場所をつくります。""", title_size=26)
panel(s, 0.6, 2.0, 4.6, 4.9, line=GOLD)
text(s, 0.9, 2.2, 4.0, 0.4, "最初に届ける人（仮の人物）", size=13, color=GOLD, bold=True)
text(s, 0.9, 2.65, 4.0, 0.6, "みわさん　42歳　会社員", size=22, font=SERIF)
text(s, 0.9, 3.4, 4.15, 3.4, [
    "体調をととのえるため、3か月 仕事を休む",
    "休みに入る前の晩、ふと「天文台で土星を見たい」と思う",
    "でも、いま言うことではない気がして、どこにも書かない",
], size=14, color=MUTED, spacing=1.4)
rows = [
    ("手放すとき", "書いても埋もれる。消えてしまう気がする", "星にして、本物の星空に灯す"),
    ("離れている間", "見返すと焦る。期限や通知がつらい", "何もしなくても星は暗くならない"),
    ("戻ったとき", "一覧を開くと多すぎて、また閉じる", "1つだけ、願いの方から帰ってくる"),
]
text(s, 5.6, 2.0, 2.0, 0.4, "場面", size=12, color=MUTED)
text(s, 7.3, 2.0, 2.9, 0.4, "起きていること", size=12, color=MUTED)
text(s, 10.2, 2.0, 2.8, 0.4, "MORUNE がすること", size=12, color=GOLD)
for i, (a, b, c) in enumerate(rows):
    y = 2.45 + i * 1.25
    panel(s, 5.5, y, 7.3, 1.1)
    text(s, 5.7, y, 1.6, 1.1, a, size=15, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 7.3, y, 2.8, 1.1, b, size=14, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 10.2, y, 2.5, 1.1, c, size=14, color=GOLD, anchor=MSO_ANCHOR.MIDDLE)
text(s, 5.5, 6.25, 7.4, 0.7, "入口はだれでも。広がりは育休・介護・忙しい時期の人、会社の復職の支え。\nペルソナは仮説で、これから確かめる（08）", size=12, color=MUTED)

# 3 世界観 ---------------------------------------------------------------------
s = new_slide("03", "World", "星空は、みんなの願いでできている。帰ってくるのは、自分の願いだけ。", """【2:30–3:10】
・預けた願いは、名前なしで、今いる場所の本物の星空に金色の星として灯ります。見せたくない願いは「自分だけの星」にできます。
・星に触れると、言葉がふわっと浮かんで消えます。ほかの人の願いとは偶然すれ違うだけ。返信もいいねの数もありません。
・ある日、スマホを振ると、自分の願いが1つだけ地球へ帰ってきます。一覧で全部見るのではなく、願いの方から帰ってくる。""", title_size=26)
steps = [("預ける", "02-deposit.png", "12字まで\n名前なしで\nみんなの星空に\n灯る"),
         ("出会う", "04-float-1.png", "星に触れると\n言葉が浮かんで\n消える"),
         ("帰ってくる", "08-card.png", "ある日\n1つだけ\n自分の願いが\n帰ってくる")]
for i, (h, img, b) in enumerate(steps):
    x = 0.9 + i * 4.15
    picture(s, img, x, 1.95, h=4.3)
    text(s, x + 2.15, 2.6, 1.9, 0.5, f"{i + 1}", size=28, color=GOLD, font=SERIF)
    text(s, x + 2.15, 3.2, 1.9, 0.6, h, size=20, font=SERIF)
    text(s, x + 2.15, 3.9, 1.9, 1.6, b, size=13, color=MUTED, spacing=1.4)
text(s, 0.9, 6.5, 11.5, 0.5, "人に見せたくない願いは「自分だけの星」にできる。気になる言葉は、星空に出す前に見守りで止まる。", size=13, color=MUTED)

# 4 デモ -----------------------------------------------------------------------
s = new_slide("04", "Demo", "デモ：預ける → 星空 → 1つ帰ってくる → 帰還票", """【3:10–6:10】ライブデモ。うまくいかないときはこの動画を再生する（約60秒、見本の願い入り）
・まず願いを書いて預けます（「ギターをもう一度」）。
・星空には、わたしの願いと、ほかの人の願いが灯っています。触れると言葉が浮かびます。
・スマホを振ります（会場ではタップの「ひとつ帰す」でも）。
・カプセルが地球に着きました。開くと、言葉が星空から降りてきます。
・「天文台で土星の輪を見る」。30日ぶりに帰ってきました。
・受け取ると、帰還票が現像されます。最初の小さな一歩を1つだけ書きます。「土曜の観望会を調べる」。
・X にシェアするかは自分で決めます。""")
movie = s.shapes.add_movie(str(HERE / "demo-phone.mp4"), Inches(1.0), Inches(1.55), Inches(2.6), Inches(5.63),
                           poster_frame_image=str(IMG / "01-home.png"), mime_type="video/mp4")
text(s, 1.0, 7.18, 2.6, 0.3, "▶ クリックで再生（予備の録画）", size=10, color=MUTED, align=PP_ALIGN.CENTER)
flow = [("1", "願いを書いて預ける", "12字まで"),
        ("2", "星空を眺める", "自分とみんなの願いが浮かぶ"),
        ("3", "スマホを振る", "タップの「ひとつ帰す」でも"),
        ("4", "カプセルが着地する", "言葉が星空から降りてくる"),
        ("5", "「30日ぶりに帰ってきました」", "受け取る／もう少し預ける"),
        ("6", "帰還票が現像される", "最初の小さな一歩を1つ書く")]
for i, (n, h, b) in enumerate(flow):
    y = 1.75 + i * 0.88
    text(s, 4.3, y, 0.5, 0.7, n, size=24, color=GOLD, font=SERIF)
    text(s, 4.9, y, 4.6, 0.45, h, size=18)
    text(s, 4.9, y + 0.42, 4.6, 0.4, b, size=12, color=MUTED)
picture(s, "10b-receipt-step.png", 9.7, 1.55, h=5.63)

# 5 最後の30秒 -----------------------------------------------------------------
s = new_slide("04", "The last 30 seconds", "いちばん磨くのは、願いが帰ってきた最後の30秒", """【デモの中で話す／5分版では省く】
・カードより先に、言葉に出会う。言葉が星空から降りてきます。
・「30日ぶりに帰ってきました」。預けた日と待っていた日数だけ。急かす言葉は入れません。
・受け取るか、もう少し預けるかの2択。今でなくていいなら星空へ戻せます。
・帰還票は紙が上から少しずつ現れます。会場では感熱プリンターから本物の紙が出てきます。""")
for i, img in enumerate(["06-landed.png", "07-descend.png", "08-card.png", "09-developing.png", "10b-receipt-step.png"]):
    picture(s, img, 0.6 + i * 2.5, 1.75, h=4.6)
caps = ["着地する", "言葉が降りてくる", "30日ぶりに\n帰ってきました", "現像される", "一歩を書く"]
for i, c in enumerate(caps):
    text(s, 0.6 + i * 2.5, 6.45, 2.13, 0.8, c, size=13, color=GOLD, align=PP_ALIGN.CENTER)

# 6 展示シナリオ ----------------------------------------------------------------
s = new_slide("05", "Exhibition", "科学館・宇宙イベントで「星空に願いを預ける」", """【6:10–7:40】
・本命は科学館や宇宙イベントでの展示です。来場者は入口の QR を自分のスマホで読み、願いを預けます。
・会場の大きな画面の星空に自分の星が灯り、来場者の願いがふわっと浮かんでは消えます。
・スマホを振るとカプセルが帰ってきて、感熱プリンターから帰還票が出てきます。持ち帰って、家で残りの願いが1つずつ帰ってきます。
・必要なのは画面1つ、PC1台、感熱プリンター1台、スタッフ1〜2人。気になる言葉は大きな画面に出る前に止まります。
・展開先として、商業施設のポップアップ、星空の町の観光イベントも考えています。""")
picture(s, "20-big-intro.png", 0.6, 1.8, w=6.2)
text(s, 0.6, 5.4, 6.2, 0.4, "その会場の緯度経度で、その場所の本物の星空を描く", size=12, color=MUTED)
flow = ["入口の QR を自分のスマホで読む", "願いを預ける → 会場の大きな画面に自分の星が灯る",
        "スマホを振る → カプセルが帰ってくる", "感熱プリンターから帰還票が出てくる", "家で、残りの願いが1つずつ帰ってくる"]
text(s, 7.2, 1.8, 5.6, 0.4, "来場者の2〜3分", size=13, color=GOLD, bold=True)
text(s, 7.2, 2.2, 5.6, 2.8, [f"{i + 1}　{t}" for i, t in enumerate(flow)], size=15, spacing=1.55)
panel(s, 7.2, 5.05, 5.6, 0.9)
text(s, 7.4, 5.05, 5.3, 0.9, "画面1・PC1・感熱プリンター1・スタッフ1〜2人\n気になる言葉は、大きな画面に出る前に止まる", size=12, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
text(s, 0.6, 6.15, 12.2, 1.0, [
    [("展開　", {"color": GOLD, "bold": True}), ("B 商業施設・七夕や新年のポップアップ（1分版＋サンプルカプセル）　／　C 星空の町の観光・移住イベント　／　共創 アーティストと帰還票の絵柄・会場の映像", {})]
], size=13)

# 7 帰還票 ---------------------------------------------------------------------
s = new_slide("06", "Take-home", "紙が、家までアプリを連れて帰る", """【7:40–8:00】
・帰還票です。文字は最小限。番号、星のドット絵、願い、預けた日から帰ってきた日、QR、最初の一歩だけ。
・絵はガチャで、どれが出るかは現像されるまで分かりません。
・QR から自分の星へ戻れます。半券の一歩は切り取ってカプセルに入れられます。
（ここで実物の紙を見せる。写真は本人が差し替え）""")
picture(s, "10b-receipt-step.png", 0.9, 1.6, h=5.6)
pts = [("文字は最小限", "番号・星のドット絵・願い・預けた日→帰ってきた日・QR・最初の一歩だけ"),
       ("絵はガチャ", "夕方の一番星・満天の星・夜明け、たまに流れ星。現像されるまで分からない"),
       ("紙がアプリへ連れ戻す", "QR から自分の星へ戻れる。半券の一歩は切り取ってカプセルに入れられる")]
for i, (h, b) in enumerate(pts):
    y = 1.8 + i * 1.25
    text(s, 4.0, y, 4.3, 0.5, h, size=19, font=SERIF)
    text(s, 4.0, y + 0.5, 4.3, 0.7, b, size=13, color=MUTED)
panel(s, 8.7, 1.6, 4.1, 5.6, line=MUTED)
text(s, 8.7, 1.6, 4.1, 5.6, "［実物の写真］\n感熱プリンターで印刷した帰還票と\nサンプルカプセルの写真をここに", size=14, color=MUTED, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

# 8 技術 -----------------------------------------------------------------------
s = new_slide("07", "Technology", "見せ方は自由に、データの扱いは厳しく", """【8:00–8:40】
・本物の星空は、Yale 輝星星表の5,080星を同梱し、時刻と位置から計算して描いています。位置情報は端末の中で使うだけで、送りません。
・サーバーに送るのは、名前なしの願いの言葉と端末ごとのランダムな ID だけです。気になる言葉は保留して確認し、通報3件で非表示になります。
・AI で願いの絵をつくる、星座の線でつなぐ、応援の信号。どれも作って試してから、自分の判断でやめました。
・コードは AI（Claude と Codex）に書かせ、互いにレビューさせています。何を作り、何をやめるかは自分が決めました。自動テストは212件です。""")
panel(s, 0.6, 1.8, 5.2, 2.6)
text(s, 0.85, 1.9, 4.8, 0.4, "スマホの中", size=13, color=GOLD, bold=True)
text(s, 0.85, 2.3, 4.8, 2.1, ["本物の星空：5,080星を時刻と位置から計算", "位置情報は計算に使うだけ。送らない",
                              "自分の願いと帰還の記録：端末に保存", "帰還票：白黒の画像をその場でつくる", "オフラインでも動く"],
     size=13, color=MUTED, spacing=1.35)
text(s, 0.6, 4.45, 5.2, 0.5, "⇅　送るのは、名前なしの言葉と、ランダムな ID だけ", size=12, color=GOLD, align=PP_ALIGN.CENTER)
panel(s, 0.6, 4.95, 5.2, 2.0)
text(s, 0.85, 5.05, 4.8, 0.4, "サーバー（Cloudflare Workers ＋ D1）", size=13, color=GOLD, bold=True)
text(s, 0.85, 5.45, 4.8, 1.5, ["みんなの星空：名前なしの願いの言葉", "見守り：気になる言葉は保留、通報3件で非表示", "人の番号（25143-0007）の発行"],
     size=13, color=MUTED, spacing=1.35)
text(s, 6.3, 1.8, 6.5, 0.4, "作ってから、やめたもの", size=13, color=GOLD, bold=True)
tried = [("AI で願いの絵をつくる", "願いのイメージとずれる", "星のドット絵ガチャに"),
         ("願いを星座の線でつなぐ", "意味が伝わらなかった", "星が光るだけに"),
         ("応援の信号（振って明るく）", "シェアとの違いが分かりにくい", "X のいいねで受け取る"),
         ("北45°の固定の星空", "季節で願いの星が沈む", "星座早見盤に")]
for i, (a, b, c) in enumerate(tried):
    y = 2.25 + i * 0.95
    panel(s, 6.3, y, 6.5, 0.82)
    text(s, 6.45, y, 2.5, 0.82, a, size=13, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 8.95, y, 1.85, 0.82, b, size=11, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 10.8, y, 1.95, 0.82, "→ " + c, size=11, color=GOLD, anchor=MSO_ANCHOR.MIDDLE)
text(s, 6.3, 6.1, 6.5, 0.9, "AI（Claude・Codex）にコードを書かせ、互いにレビューさせた。\n何を作り、何をやめるかは自分が決めた。自動テスト 212件。", size=13)

# 9 分かっていること -------------------------------------------------------------
s = new_slide("08", "Evidence", "分かっていること、これから確かめること", """【8:40–9:20】
・公開から2日で、約12人が願いを預けてくれました。番号の発行数です。
・届いた声は1つ。「電車で位置が取れず止まる」。その日のうちに直して公開しました。
・アンケートの回答は0件でした。1分で返せる頼み方に変えます。
・確かめたいのは3つ。また開くか、展示で持ち帰りたくなるか、置きたい場所があるか。GGA の交流会でも確かめます。""")
stats = [("約12", "公開2日で願いを預けた人\n（番号の発行数）"), ("1", "届いた声「電車で位置が取れない」\n→ 当日中に直して公開"), ("0", "アンケートの回答。\n1分で返せる頼み方に変える")]
for i, (n, b) in enumerate(stats):
    x = 0.6 + i * 4.15
    panel(s, x, 1.8, 3.9, 2.2)
    text(s, x + 0.3, 1.9, 3.4, 1.0, n, size=44, color=GOLD, font=SERIF)
    text(s, x + 0.3, 2.95, 3.4, 1.0, b, size=13, color=MUTED)
qs = [("本当に、また開くか", "預けた人のうち、3日後に自分から開いた人の割合", "セレクションまでに数人分"),
      ("展示で、持ち帰りたくなるか", "帰還票を持ち帰った人・家で QR を開いた人", "GGA の交流会"),
      ("置きたい場所があるか", "「この体験を置ける場所がある」と言った施設・人の数", "GGA の交流会とその後")]
text(s, 0.6, 4.25, 4, 0.4, "確かめたいこと", size=12, color=MUTED)
text(s, 5.0, 4.25, 4.6, 0.4, "見る数字", size=12, color=MUTED)
text(s, 10.2, 4.25, 2.6, 0.4, "いつ", size=12, color=MUTED)
for i, (a, b, c) in enumerate(qs):
    y = 4.65 + i * 0.8
    panel(s, 0.6, y, 12.2, 0.7)
    text(s, 0.8, y, 4.2, 0.7, a, size=15, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 5.0, y, 5.1, 0.7, b, size=13, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 10.2, y, 2.5, 0.7, c, size=13, color=GOLD, anchor=MSO_ANCHOR.MIDDLE)

# 10 仕組み --------------------------------------------------------------------
s = new_slide("09", "How it sustains", "体験を届ける場と、持ち帰る物で成り立たせる。個人からは取らない", """【9:20–9:40】
・アプリは無料のままにします。願いは長く預けるもので、データの守りとサポートの体制ができるまでは、お金をもらう責任を負えないからです。
・展示の導入、持ち帰る物、アーティストとの共創の3つで成り立たせます。
・MORUNE は商標登録済みです。商品には 25143・星・MORUNE だけを入れます。""", title_size=26)
cols = [("展示の導入", "科学館・商業施設・自治体", "体験一式（画面の設定・プリンター・運営の手順）を期間で提供。出展ごとの料金"),
        ("持ち帰る物", "来場者", "サンプルカプセル（ブレスレット）・キーホルダー・帰還票の台紙。数百円〜千円台（仮説）"),
        ("共創", "アーティスト・ブランド", "帰還票の絵柄・会場の演出を一緒につくる。限定の帰還票")]
for i, (h, who, b) in enumerate(cols):
    x = 0.6 + i * 4.15
    panel(s, x, 2.0, 3.9, 3.6)
    text(s, x + 0.3, 2.2, 3.4, 0.6, h, size=22, font=SERIF)
    text(s, x + 0.3, 2.85, 3.4, 0.4, who, size=13, color=GOLD)
    text(s, x + 0.3, 3.4, 3.4, 2.1, b, size=14, color=MUTED, spacing=1.4)
text(s, 0.6, 5.9, 12.2, 1.0, "アプリは無料のまま（データの守りとサポートの体制ができるまで）。MORUNE は商標登録済み。\n商品には「25143」・星・MORUNE だけを入れる。物販の前に特定商取引法の表示を整える。", size=13, color=MUTED)

# 11 Ask -----------------------------------------------------------------------
s = new_slide("10", "Ask", "一緒にやりたい人を探しています", """【9:40–10:00】
・場を持つ方。科学館、プラネタリウム、商業施設、自治体のイベント担当の方。まず1回、試しに置かせてください。
・つくる方。星空や帰還票の絵柄、映像を一緒に描いてくれるアーティスト。
・確かめる方。しばらく日常から離れた経験がある人と、その人たちにつながるコミュニティ。
・QR からいま預けられます。ありがとうございました。（QR を出したまま質疑へ）""")
asks = [("場を持つ方", "科学館・プラネタリウム・商業施設・自治体のイベント担当。\nまず1回、試しに置かせてください"),
        ("つくる方", "星空や帰還票の絵柄・映像を\n一緒に描いてくれるアーティスト"),
        ("確かめる方", "しばらく日常から離れた経験がある人と、\nその人たちにつながるコミュニティ")]
for i, (h, b) in enumerate(asks):
    y = 1.9 + i * 1.6
    panel(s, 0.6, y, 8.2, 1.4, line=GOLD if i == 0 else None)
    text(s, 0.9, y + 0.1, 2.3, 1.2, h, size=20, font=SERIF, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 3.3, y + 0.1, 5.3, 1.2, b, size=14, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
panel(s, 9.4, 1.9, 3.4, 4.6, fill=RGBColor(0xFF, 0xFF, 0xFF))
picture(s, "qr-site.png", 9.65, 2.1, w=2.9)
text(s, 9.4, 5.1, 3.4, 1.3, ["いま、ひとつ預けられます", "morune-25143.morune-25143.workers.dev"], size=11,
     color=NIGHT, align=PP_ALIGN.CENTER)

prs.save(OUT)
print("saved", OUT)
