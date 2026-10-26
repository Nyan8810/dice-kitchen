# 別のPCで DICE KITCHEN ホームページ作成を始める方法

最終更新：2026-10-26

このファイルを、作業したいPCに渡して使ってください（USBメモリ・メール・LINEなど、方法は何でもOKです）。

- GitHubのアカウント：**Nyan8810**
- リポジトリ（ファイル置き場）：https://github.com/Nyan8810/dice-kitchen

---

## かんたんな方法：Claudeに準備を任せる（おすすめ）

### 1. Claudeのデスクトップアプリを入れる
- https://claude.ai/download からダウンロードしてインストール
- いつものアカウントでログイン

### 2. 作業用のフォルダを決めて、Claudeを開く
- 例：「ドキュメント」の中に `ホームページ作業` などの空のフォルダを作る
- Claudeアプリの **Code** タブで新しいセッションを作り、そのフォルダを選ぶ

### 3. Claudeに次の文章をそのまま送る

```
別のPCで進めていたホームページ作成の続きをこのPCでやりたいです。
次の準備をしてください。

1. Git と GitHub CLI が入っていなければ winget で入れる（Git.Git と GitHub.cli）
2. GitHub にサインインする（アカウントは Nyan8810。gh auth login --web を使い、確認コードを教えてください）
3. Nyan8810/dice-kitchen をこのフォルダにダウンロード（clone）する
4. このリポジトリ用に git の名前とメールを設定する
   - user.name：Nyan8810
   - user.email：348138997+Nyan8810@users.noreply.github.com（本人のメールは使わない）
5. 引き継ぎメモ.md の「現在の作業ブランチ」に書かれたブランチに切り替える
6. 引き継ぎメモ.md を読んで、残っている作業を教えてください
```

### 4. 途中でやること（ご自身の操作は2つだけ）
- **インストールの許可**：Windowsの「このアプリがデバイスに変更を加えることを許可しますか？」で「はい」を押す
- **GitHubのサインイン**：Claudeが表示する確認コードを https://github.com/login/device に入力し、「Authorize github」を押す

これで準備は完了です。2回目からは、手順2のフォルダでセッションを始めるだけです。

---

## 毎回の作業の流れ（とても大事）

### 作業を始めるとき
Claudeに **「GitHubから最新を取り込んで」** と伝える（git pull）

### 作業を終えるとき
Claudeに **「GitHubに保存して」** と伝える（commit と push）

### 守ること
- **2台で同時に作業しない**：片方で保存（push）してから、もう片方で取り込む（pull）
- **保存を忘れたまま別のPCに移らない**：保存していない変更は、もう一方のPCには届きません
- **秘密の情報は書かない**：リポジトリは公開なので、パスワードや個人情報はファイルに書かない

---

## 自分でコマンドを打つ場合（参考）

PowerShellを開いて、上から順に実行します。

1. Git と GitHub CLI を入れる
   ```powershell
   winget install --id Git.Git -e --source winget
   winget install --id GitHub.cli -e --source winget
   ```
   入れたあとは、PowerShellを一度閉じて開き直す

2. GitHubにサインインする（表示された確認コードをブラウザで入力）
   ```powershell
   gh auth login --hostname github.com --git-protocol https --web
   ```

3. 作業したい場所に移動して、ダウンロードする
   ```powershell
   cd $HOME\Documents
   gh repo clone Nyan8810/dice-kitchen
   cd dice-kitchen
   ```

4. 名前とメールを設定する
   ```powershell
   git config user.name "Nyan8810"
   git config user.email "348138997+Nyan8810@users.noreply.github.com"
   gh auth setup-git
   ```

5. 作業中のブランチに切り替える（ブランチ名は引き継ぎメモ.mdの「現在の作業ブランチ」を参照）
   ```powershell
   git switch fill/remaining-blanks
   ```

---

## 困ったとき
- **「git が見つかりません」と出る**：インストール後にPowerShellやClaudeアプリを開き直す
- **確認コードの期限が切れた**：もう一度サインインのコマンドを実行して、新しいコードを出す
- **「conflict（競合）」と出る**：2台で同じところを書き換えた状態です。自分で直そうとせず、Claudeに「競合を解決して」と伝える
