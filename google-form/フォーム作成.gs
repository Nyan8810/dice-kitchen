/**
 * DICE KITCHEN お見積もり・ご相談フォームを作るプログラム（Google Apps Script）
 *
 * 使い方（はじめてフォームを作るとき）：
 *   1. https://script.google.com で「新しいプロジェクト」を作る
 *   2. 最初から入っている文字を全部消して、このファイルの中身を貼り付けて保存
 *   3. 上の関数の選択で「setup」を選んで「実行」（1回だけ）
 *   4. 実行ログに出る「回答用URL」を開いて、試しに送信する
 *
 * 使い方（問い合わせの管理表を作るとき。フォームはもうある前提）：
 *   1. https://script.google.com で、フォームを作ったときと同じプロジェクトを開く
 *   2. 中身を全部消して、このファイルの中身を貼り付けて保存
 *   3. 上の関数の選択で「setupSheet」を選んで「実行」（1回だけ。setup は実行しない）
 *   4. 実行ログに出る「管理表のURL」を開く
 *
 * 送信されると、お客様には完了メール、フォームの持ち主には通知メールが届きます。
 * 管理表を作ったあとは、問い合わせが管理表に1行ずつ自動で追加されます。
 * ホームページの問い合わせフォーム（docs/index.html）と同じ項目にしています。
 */

const SHOP_NAME = 'DICE KITCHEN';
const PLAN_CHOICES = ['フードプラン（¥4,500〜/名）', 'フード＋ドリンクプラン（¥6,500〜/名）', '相談して決めたい'];

// ホームページとつながっているフォーム（docs/index.html の送信先URLの /d/e/〜/ の部分）
const FORM_PUBLISHED_ID = '1FAIpQLSdrfUf-xvtgXuRBV96hP3qaN5zwdk7yJ2FnpzUMZDEpU2H5og';
const STATUS_CHOICES = ['未対応', '見積もり送付済み', '予約確定', '開催済み', 'お断り・キャンセル'];
const EXTRA_HEADERS = ['対応状況', '見積金額', 'メモ'];

function setup() {
  // 作り直すと送信先が変わり、ホームページとのつながりが切れるため止める
  if (findLiveForm_()) {
    throw new Error('ホームページとつながっているフォームがすでにあります。管理表を作るときは「setupSheet」を実行してください。');
  }

  const form = FormApp.create(SHOP_NAME + ' お見積もり・ご相談（無料）');
  form.setDescription(
    'ケータリングのお見積もり・ご相談はこちらからお送りください。\n' +
    '開催日や人数が未定の場合は、分かる範囲でご記入ください。'
  );
  form.setConfirmationMessage(
    'お問い合わせありがとうございます。\n' +
    'ご入力いただいたメールアドレスに、確認メールをお送りしました。'
  );

  form.addTextItem().setTitle('お名前').setRequired(true);
  form.addTextItem()
    .setTitle('メールアドレス')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('メールアドレスの形式で入力してください')
      .requireTextIsEmail()
      .build());
  form.addTextItem().setTitle('電話番号');
  form.addListItem()
    .setTitle('ご利用シーン')
    .setChoiceValues(['企業パーティー', 'ウェディング・二次会', 'ホームパーティー', 'イベント', 'その他']);
  form.addListItem()
    .setTitle('ご希望のプラン')
    .setChoiceValues(PLAN_CHOICES);
  form.addDateItem().setTitle('開催日（予定）');
  form.addTextItem()
    .setTitle('人数（目安）')
    .setValidation(FormApp.createTextValidation()
      .setHelpText('数字で入力してください')
      .requireNumberGreaterThan(0)
      .build());
  form.addParagraphTextItem().setTitle('ご予算・ご要望');

  ScriptApp.newTrigger('onSubmit').forForm(form).onFormSubmit().create();

  Logger.log('回答用URL（お客様に見せるページ）: ' + form.getPublishedUrl());
  Logger.log('編集用URL（項目を直すページ）: ' + form.getEditUrl());
}

/**
 * 問い合わせの管理表（スプレッドシート）を作り、フォームとつなぐ。
 * もう一度実行しても、同じ管理表の見た目を整え直すだけで、データは消えない。
 */
function setupSheet() {
  const form = findLiveForm_();
  if (!form) {
    throw new Error('ホームページとつながっているフォームが見つかりません。フォームを作ったときと同じGoogleアカウントで実行してください。');
  }

  let ss = null;
  try {
    ss = SpreadsheetApp.openById(form.getDestinationId());
  } catch (err) {
    // まだスプレッドシートとつながっていない
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SHOP_NAME + ' お問い合わせ管理');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    SpreadsheetApp.flush();
    ss = SpreadsheetApp.openById(ss.getId()); // つないだ直後にできる回答用シートを読み込み直す
  }

  const sheet = ss.getSheets().filter(function (s) { return s.getFormUrl(); })[0];
  if (!sheet) {
    throw new Error('回答用のシートが見つかりません。少し待ってから、もう一度「setupSheet」を実行してください。');
  }
  sheet.setName('お問い合わせ一覧');

  // 作成時に付いてくる空のシートは不要なので消す
  ss.getSheets().forEach(function (s) {
    if (s.getSheetId() !== sheet.getSheetId() && !s.getFormUrl() && s.getLastRow() === 0) {
      ss.deleteSheet(s);
    }
  });

  // フォームの項目の右側に、お店用の列（対応状況・見積金額・メモ）を足す
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let statusCol = headers.indexOf(EXTRA_HEADERS[0]) + 1;
  if (!statusCol) {
    statusCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, statusCol, 1, EXTRA_HEADERS.length).setValues([EXTRA_HEADERS]);
  }
  const lastCol = statusCol + EXTRA_HEADERS.length - 1;
  const rows = sheet.getMaxRows() - 1;

  sheet.getRange(2, statusCol, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS_CHOICES, true).setAllowInvalid(false).build()
  );
  sheet.getRange(2, statusCol + 1, rows, 1).setNumberFormat('¥#,##0');

  // 見た目：見出しを固定し、お店用の列は金色で区別する
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, statusCol - 1).setFontWeight('bold').setBackground('#25201c').setFontColor('#f2ece4');
  sheet.getRange(1, statusCol, 1, EXTRA_HEADERS.length).setFontWeight('bold').setBackground('#c9a45c').setFontColor('#1a1510');
  sheet.setColumnWidth(statusCol, 150);
  sheet.setColumnWidth(statusCol + 1, 110);
  sheet.setColumnWidth(statusCol + 2, 260);
  const requestCol = headers.indexOf('ご予算・ご要望') + 1;
  if (requestCol) {
    sheet.setColumnWidth(requestCol, 280);
    sheet.getRange(2, requestCol, rows, 1).setWrap(true);
  }

  // 表として見やすいように、すべてのセルに罫線を引く
  sheet.getRange(1, 1, rows + 1, lastCol)
    .setBorder(true, true, true, true, true, true, '#bfbfbf', SpreadsheetApp.BorderStyle.SOLID);

  // 対応状況で行に色を付ける（未対応は赤で目立たせ、返し忘れを防ぐ）
  const col = columnLetter_(statusCol);
  const range = sheet.getRange(2, 1, rows, lastCol);
  const rule = function (formula, background, fontColor) {
    const b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setBackground(background).setRanges([range]);
    if (fontColor) b.setFontColor(fontColor);
    return b.build();
  };
  sheet.setConditionalFormatRules([
    rule('=AND($A2<>"",OR($' + col + '2="",$' + col + '2="未対応"))', '#f8d7da'),
    rule('=$' + col + '2="見積もり送付済み"', '#fff3cd'),
    rule('=$' + col + '2="予約確定"', '#d4edda'),
    rule('=$' + col + '2="開催済み"', '#e9ecef'),
    rule('=$' + col + '2="お断り・キャンセル"', '#f1f1f1', '#999999'),
  ]);

  // 通知メールに管理表のURLを載せるために覚えておく
  PropertiesService.getScriptProperties().setProperty('SHEET_URL', ss.getUrl());

  Logger.log('管理表のURL: ' + ss.getUrl());
}

/** フォームが送信されるたびに自動で動く */
function onSubmit(e) {
  const answers = {};
  e.response.getItemResponses().forEach(function (r) {
    answers[r.getItem().getTitle()] = r.getResponse();
  });

  const summary = Object.keys(answers)
    .filter(function (title) { return answers[title] !== ''; })
    .map(function (title) { return '■ ' + title + '\n' + answers[title]; })
    .join('\n\n');

  const owner = Session.getEffectiveUser().getEmail();
  const customerName = answers['お名前'];
  const sheetUrl = PropertiesService.getScriptProperties().getProperty('SHEET_URL');

  MailApp.sendEmail({
    to: answers['メールアドレス'],
    replyTo: owner,
    name: SHOP_NAME,
    subject: '【' + SHOP_NAME + '】お問い合わせありがとうございます',
    body:
      customerName + ' 様\n\n' +
      'このたびは ' + SHOP_NAME + ' にお問い合わせいただき、ありがとうございます。\n' +
      '内容を確認のうえ、24時間以内に担当よりご連絡いたします。\n\n' +
      '――― ご入力内容 ―――\n\n' +
      summary + '\n\n' +
      '――――――――――――\n' +
      'このメールは自動でお送りしています。\n' +
      '内容に誤りがある場合は、このメールにそのまま返信してお知らせください。\n\n' +
      SHOP_NAME + '\n' +
      '藤沢のBAR「THREE DICE」の出張ケータリング',
  });

  MailApp.sendEmail({
    to: owner,
    name: SHOP_NAME + ' フォーム',
    subject: '【新しいお問い合わせ】' + customerName + ' 様',
    body: 'ホームページのフォームからお問い合わせが届きました。\n\n' + summary +
      (sheetUrl ? '\n\n管理表：' + sheetUrl : ''),
  });
}

/** ホームページとつながっているフォームを、Googleドライブの中から探す */
function findLiveForm_() {
  const files = DriveApp.getFilesByType(MimeType.GOOGLE_FORMS);
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed()) continue;
    const form = FormApp.openById(file.getId());
    if (form.getPublishedUrl().indexOf(FORM_PUBLISHED_ID) !== -1) return form;
  }
  return null;
}

/** 列番号をA, B, …, AA の形にする */
function columnLetter_(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
