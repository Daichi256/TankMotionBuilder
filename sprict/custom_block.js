    const javascriptGenerator = Blockly.JavaScript;
    // 新しいブロック定義
    Blockly.Blocks['start_block'] = {
        init: function() {
        this.appendDummyInput()
            .appendField("スタート");
        this.setNextStatement(true, null);
        this.setColour(120);
        this.setTooltip('プログラムの開始ブロック');
        this.setHelpUrl('');
            // ワークスペースに1つしか置けないように制御
            this.setOnChange(function(changeEvent) {
            if (!this.workspace) return;
            const allBlocks = this.workspace.getTopBlocks(false);
            const startBlocks = allBlocks.filter(b => b.type === 'start_block');
            if (startBlocks.length > 1) {
                // 自分以外のスタートブロックがあれば削除
                startBlocks.forEach(b => {
                if (b.id !== this.id) {
                    b.dispose(true);
                }
                });
                alert("スタートブロックは1つだけしか置けません");
            }
            });
        }
    };
    
    javascriptGenerator.forBlock['start_block'] = function(block, generator) {
    // 変数を定義する
        return `let Up,Down,Left,Right,duty = 100;
let LED_L_flag = 0,LLED_duty = 100,LED_R_flag = 0,RLED_duty = 100;
let Canon = 0,duration_ms = 0;
console.log("Up,Right,Down,Left,duty,LED_L_flag,LLED_duty,LED_R_flag,RLED_duty,Canon,duration_ms");\n`; // スタートブロックは処理なし
};
    // for文ブロック定義
    // 繰り返しブロック（シンプル）
    Blockly.Blocks['repeat_block'] = {
        init: function() {
        this.appendDummyInput()
            .appendField("繰り返す回数")
            .appendField(new Blockly.FieldNumber(1, 1), "TIMES");
        this.appendStatementInput("DO")
            .setCheck(null)
            .appendField("処理");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
        this.setTooltip('指定回数だけ繰り返す');
        this.setHelpUrl('');
        }
    };
    // JavaScript生成
    javascriptGenerator.forBlock['repeat_block'] = function(block, generator){
        const times = block.getFieldValue('TIMES');
        const statements_do = Blockly.JavaScript.statementToCode(block, 'DO');
        const code = `for (let i = 0; i < ${times}; i++) {\n${statements_do}}\n`;
        return code;
    };


    // 戦車移動ブロック（時間単位追加版）
    Blockly.Blocks['tank_move'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("戦車を移動")
                .appendField(new Blockly.FieldDropdown([
                    ["前進", "UP"],
                    ["後退", "DOWN"],
                    ["右", "RIGHT"],
                    ["左", "LEFT"],
                    ["前進右斜め", "UPRIGHT"],
                    ["前進左斜め", "UPLEFT"],
                    ["後退右斜め", "DOWNRIGHT"],
                    ["後退左斜め", "DOWNLEFT"],
                    ["停止", ""]
                ]), "DIR")
                .appendField("時間")
                .appendField(new Blockly.FieldNumber(500, 0), "TIME") // 初期値
                .appendField(new Blockly.FieldDropdown([
                    ["ms", "MS"],
                    ["秒", "SEC"],
                    ["分", "MIN"]
                ]), "UNIT");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(120);
            this.setTooltip("戦車を指定方向に指定時間だけ動かす");
        }
    };

    // JavaScript生成
    // JavaScript生成（整数化バージョン）
    javascriptGenerator.forBlock['tank_move'] = function(block, generator){
        const dir = block.getFieldValue('DIR');
        let time = Number(block.getFieldValue('TIME'));
        const unit = block.getFieldValue('UNIT');

        // 単位をmsに変換
        if(unit === "SEC") time *= 1000;
        if(unit === "MIN") time *= 1000 * 60;

        // 整数化
        time = Math.floor(time);

        // 方向フラグをリセット
        let code = 'Up=0;Down=0;Left=0;Right=0;\n';

        // 指定方向フラグを1にする
        if(dir.includes('UP')) code += 'Up=1;\n';
        if(dir.includes('DOWN')) code += 'Down=1;\n';
        if(dir.includes('LEFT')) code += 'Left=1;\n';
        if(dir.includes('RIGHT')) code += 'Right=1;\n';

        // duration_ms に時間をセット
        code += `duration_ms = ${time};\n`;

        // デバッグ用ログ
        code += 'console.log([Up,Right,Down,Left,duty,LED_L_flag,LLED_duty,LED_R_flag,RLED_duty,Canon,duration_ms].join(","));\n';

        return code;
    };


    // LED操作ブロック（duty追加版）
    Blockly.Blocks['led_control'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("ライト")
                .appendField(new Blockly.FieldDropdown([
                    ["両方","LR"],
                    ["左","L"],
                    ["右","R"],
                ]), "SIDE")
                .appendField("を")
                .appendField(new Blockly.FieldDropdown([
                    ["ON","1"],
                    ["OFF","0"]
                ]), "STATE")
                .appendField("明るさ")
                .appendField(new Blockly.FieldNumber(100, 0, 100, 1), "DUTY"); // 0〜100整数
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(60);
            this.setTooltip("LEDのON/OFFと明るさ(duty)を設定します");
        }
    };

    // JavaScript生成
    javascriptGenerator.forBlock['led_control'] = function(block, generator){
        const side = block.getFieldValue('SIDE');    // "L" / "R" / "LR"
        const state = block.getFieldValue('STATE');  // "1" / "0"
        const duty = block.getFieldValue('DUTY');    // 0〜100整数

        let code = '';

        if(side === "L" || side === "LR") {
            code += `LED_L_flag = ${state};\n`;
            code += `LLED_duty = ${duty};\n`;
        }
        if(side === "R" || side === "LR") {
            code += `LED_R_flag = ${state};\n`;
            code += `RLED_duty = ${duty};\n`;
        }

        return code;
    };


    //キャノン
    Blockly.Blocks['canon_fire'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("キャノン発射")
                .appendField(new Blockly.FieldDropdown([
                    ["ON", "1"],
                    ["OFF", "0"]
                ]), "STATE");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(0); // 赤系
            this.setTooltip('大砲の発射状態を変更します');
            this.setHelpUrl('');
        }
    };
    javascriptGenerator.forBlock['canon_fire'] = function(block, generator){
        var state = block.getFieldValue('STATE'); // "1" or "0"

        // 文字列で返す
        var code = 'Canon = ' + state + ';\n';
        
        return code;
    };

    Blockly.Blocks['procedures_defnoreturn'] = {
        init: function() {
            this.appendDummyInput()
            .appendField("関数")
            .appendField(new Blockly.FieldTextInput("myFunction"), "NAME");
            this.appendStatementInput("STACK")
            .setCheck(null)
            .appendField("処理");
            this.setColour(230);
            this.setTooltip('戻り値なしの自分で作った処理（関数）を作る');
            this.setHelpUrl('');
            this.setDeletable(true);
            this.setMovable(true);
            this.setPreviousStatement(false);
            this.setNextStatement(false);
            // 名前の重複チェックと自動変更 + 呼び出しブロック同期
            this.setOnChange(function(changeEvent) {
                if (!this.workspace) return;

                if (changeEvent.type !== Blockly.Events.BLOCK_CREATE &&
                    changeEvent.type !== Blockly.Events.CHANGE) return;

                if (this.type !== 'procedures_defnoreturn') return;

                let currentName = this.getFieldValue('NAME');
                const allBlocks = this.workspace.getAllBlocks(false);

                // 自分以外の関数名を取得
                const otherNames = allBlocks
                    .filter(b => b.type === 'procedures_defnoreturn' && b.id !== this.id)
                    .map(b => b.getFieldValue('NAME'));

                let changed = false;

                // 名前が重複した場合のみ自動変更
                if (otherNames.includes(currentName)) {
                    let i = 2;
                    let newName = currentName + '_' + i;
                    while (otherNames.includes(newName)) {
                        i++;
                        newName = currentName + '_' + i;
                    }
                    this.setFieldValue(newName, 'NAME');
                    currentName = newName;
                    changed = true;
                }

                // 呼び出しブロックの名前も更新
                if (changed || changeEvent.type === Blockly.Events.CHANGE) {
                    allBlocks.forEach(b => {
                        if (b.type === 'procedures_callnoreturn') {
                            const callName = b.getFieldValue('NAME');
                            if (callName === changeEvent.oldValue || changed) {
                                b.setFieldValue(currentName, 'NAME');
                            }
                        }
                    });
                }
            });
        }
    };


    // JavaScript生成
    javascriptGenerator.forBlock['procedures_defnoreturn'] = function(block, generator){
        const name = block.getFieldValue('NAME');
        const statements = Blockly.JavaScript.statementToCode(block, 'STACK');
        const code = `function ${name}() {\n${statements}}\n`;
        return code;
    };

    // 関数呼び出しブロック
    Blockly.Blocks['procedures_callnoreturn'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("関数実行")
                .appendField(new Blockly.FieldTextInput("myFunction"), "NAME");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip('自分で作った処理（関数）を呼び出す');
            this.setHelpUrl('');
        }
    };

    // JavaScript生成（呼び出し）
    javascriptGenerator.forBlock['procedures_callnoreturn'] = function(block, generator){
        const name = block.getFieldValue('NAME');
        const code = `${name}();\n`;
        //return code;
        return code;
    };