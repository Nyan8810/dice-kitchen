/**
 * DICE KITCHEN お見積もり・ご相談フォームを作るプログラム（Google Apps Script）
 *
 * 使い方：
 *   1. https://script.google.com で「新しいプロジェクト」を作る
 *   2. 最初から入っている文字を全部消して、このファイルの中身を貼り付けて保存
 *   3. 上の関数の選択で「setup」を選んで「実行」（1回だけ）
 *   4. 実行ログに出る「回答用URL」を開いて、試しに送信する
 *
 * 送信されると、お客様には完了メール、フォームの持ち主には通知メールが届きます。
 * ホームページの問い合わせフォーム（docs/index.html）と同じ項目にしています。
 */

const SHOP_NAME = 'DICE KITCHEN';
const PLAN_CHOICES = ['フードプラン（¥4,500〜/名）', 'フード＋ドリンクプラン（¥6,500〜/名）', '相談して決めたい'];

function setup() {
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
    body: 'ホームページのフォームからお問い合わせが届きました。\n\n' + summary,
  });
}
