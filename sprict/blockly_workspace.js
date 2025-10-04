        const userLang = navigator.language || navigator.userLanguage;
        const isJapanese = userLang.startsWith('ja');

        const localeFile = isJapanese ? 'msg/json/ja.json' : null; // 英語はデフォルトで min.js のまま

        function loadLocaleAndInject() {
            if (!localeFile) {
                // 英語ならそのまま生成
                return;
            }

            fetch(localeFile)
                .then(res => res.json())
                .then(data => {
                    // JSON の内容を Blockly.Msg にコピー
                    Object.keys(data).forEach(key => {
                        Blockly.Msg[key] = data[key];
                    });
                })
                .catch(err => console.error("言語JSON読み込みエラー:", err));
        }
        // --- 実行部分（呼び出し） -
        loadLocaleAndInject();

        // Blocklyワークスペース作成
        const workspace = Blockly.inject('blocklyDiv', {
            toolbox: document.getElementById('toolbox'),
            scrollbars: true,
            move: {
                scrollbars: true,
                drag: true,
                wheel: true
            },
            renderer: 'zelos',  // 最新レンダラー
            zoom: {
                controls: false,    // + - ボタンを表示
                wheel: true,       // ホイールで拡大縮小
                startScale: 0.6,   // 初期縮小率（0.7 = 70%）
                maxScale: 1.5,
                minScale: 0.3,
                scaleSpeed: 1.1
            }
        });

        // CSV出力ボタン
        document.getElementById('exportSvcBtn').addEventListener('click', () => {
            // 1. ワークスペースの全トップブロック取得
            const allBlocks = workspace.getTopBlocks(true);

            // 2. 関数定義コードを先に生成
            let funcCode = '';
            allBlocks.forEach(b => {
            if (b.type === 'procedures_defnoreturn') {
                const name = b.getFieldValue('NAME');
                const statements = Blockly.JavaScript.statementToCode(b, 'STACK') || '';
                funcCode += `function ${name}() {\n${statements}}\n`;
            }
            });

            // 3. start_block を探して、そこから順に mainCode を構築
            let mainCode = '';
            const startBlock = allBlocks.find(b => b.type === 'start_block');
            if (startBlock) {
                let current = startBlock;
                const code = Blockly.JavaScript.blockToCode(current);
                mainCode += Array.isArray(code) ? code[0] : code;
                // 4. 実行（console.logをキャプチャ）
                (async () => {
                let output = [];
                const originalLog = console.log;
                console.log = (...args) => output.push(args.join(' '));

                try {
                    // evalで関数定義とメインコードを実行
                    await eval(funcCode + '\n' + mainCode);
                } catch (e) {
                    console.log = originalLog;
                    console.error("実行エラー:", e);
                }

                // consoleを元に戻す
                console.log = originalLog;
                console.log(funcCode);
                console.log(mainCode);
                console.log("Captured output:\n" + output.join('\n'));
                downloadFile(output.join('\n'), 'blocks.csv', 'text/csv');
                })();
            } else {
                alert("start_block が見つかりません");
            }
        });
        document.getElementById('exportProjectBtn').addEventListener('click', () => {
            const xml = Blockly.Xml.workspaceToDom(workspace);
            const xmlText = Blockly.Xml.domToPrettyText(xml);
            downloadFile(xmlText, 'project.xml', 'text/xml');
        });
        // ファイルダウンロード
        function downloadFile(text, filename, type = 'text/plain') {
            const blob = new Blob([text], { type }); // ← typeを引数から受け取る
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
        document.getElementById('fileInput').addEventListener('change', handleFileSelect);

        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (!file) return;

            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.xml')) {
                loadXML(file);
            } else if (fileName.endsWith('.csv')) {
                loadCSV(file);
            } else {
                alert("XMLまたはCSVファイルを選択してください");
            }
        }

        // XML読み込み処理
        function loadXML(file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const xmlText = event.target.result;
                const xml = Blockly.utils.xml.textToDom(xmlText);
                workspace.clear();
                Blockly.Xml.domToWorkspace(xml, workspace);
                console.log("読み込み完了", workspace.getAllBlocks().length, "個");
            };
            reader.readAsText(file);
        }

        // CSV読み込み処理
        function loadCSV(file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const csvText = event.target.result;
                processCSV(csvText);
            };
            reader.readAsText(file);
        }

        // CSVの内容をパースしてブロック生成
        function processCSV(csvText) {
            const lines = csvText.split(/\r?\n/);
            const headerLine = lines[0];

            const expectedHeader = 'Up,Right,Down,Left,duty,LED_L_flag,LLED_duty,LED_R_flag,RLED_duty,Canon,duration_ms';
            if (headerLine !== expectedHeader) {
                alert("CSVファイルが異なります");
                return;
            }

            const dataLines = lines.slice(1);
            workspace.clear();
            createStartBlock(workspace);
            let state = {
                Up: 0,Right: 0,Down: 0,Left: 0,duty: 100,
                LED_L_flag: 0,LLED_duty: 100,LED_R_flag: 0,RLED_duty: 100,
                Canon: 0,duration_ms: 0
            };


            const headerColumns = expectedHeader.split(',');

            dataLines.forEach(line => {
                if (!line.trim()) return;
                const columns = line.split(',');
                if (columns.length !== headerColumns.length) {
                    alert("CSVファイルが異なります");
                    return;
                }

                const row = {};
                headerColumns.forEach((name, i) => row[name] = columns[i]);

                handleLEDChanges( row, state);
                handleCanonChanges( row, state);
                handleMotorChanges( row, state);
            });
        }

        //スタートボタンを配置
        function createStartBlock(workspace) {
            // すでに存在していたらスキップ
            const existing = workspace.getBlocksByType('start_block', false);
            if (existing.length > 0) return existing[0];

            // ブロック作成
            const block = workspace.newBlock('start_block');
            block.initSvg();
            block.render();
            block.moveBy(50, 50); // 画面の左上に配置
            return block;
        }

        // LEDブロック生成ロジック
        function handleLEDChanges(row, state) {
            // 両方同じ変更
            if ((state.LED_L_flag != row.LED_L_flag || state.LLED_duty != row.LLED_duty) &&
                (state.LED_R_flag != row.LED_R_flag || state.RLED_duty != row.RLED_duty) &&
                (row.LED_L_flag == row.LED_R_flag && row.LLED_duty == row.RLED_duty)) {
                const LED_block = workspace.newBlock('led_control');
                LED_block.setFieldValue("LR", "SIDE");
                LED_block.setFieldValue(row.LED_L_flag.toString(), "STATE");
                LED_block.setFieldValue(row.LLED_duty.toString(), "DUTY");
                LED_block.initSvg();
                LED_block.render();
                connectToStartChain(workspace, LED_block);

                state.LED_L_flag = state.LED_R_flag = row.LED_L_flag;
                state.LLED_duty = state.RLED_duty = row.LLED_duty;
            }

            // 左LED
            if (state.LED_L_flag != row.LED_L_flag || state.LLED_duty != row.LLED_duty) {
                const LED_block = workspace.newBlock('led_control');
                LED_block.setFieldValue("L", "SIDE");
                LED_block.setFieldValue(row.LED_L_flag.toString(), "STATE");
                LED_block.setFieldValue(row.LLED_duty.toString(), "DUTY");
                LED_block.initSvg();
                LED_block.render();
                connectToStartChain(workspace, LED_block);

                state.LED_L_flag = row.LED_L_flag;
                state.LLED_duty = row.LLED_duty;
            }

            // 右LED
            if (state.LED_R_flag != row.LED_R_flag || state.RLED_duty != row.RLED_duty) {
                const LED_block = workspace.newBlock('led_control');
                LED_block.setFieldValue("R", "SIDE");
                LED_block.setFieldValue(row.LED_R_flag.toString(), "STATE");
                LED_block.setFieldValue(row.RLED_duty.toString(), "DUTY");
                LED_block.initSvg();
                LED_block.render();
                connectToStartChain(workspace, LED_block);

                state.LED_R_flag = row.LED_R_flag;
                state.RLED_duty = row.RLED_duty;
            }
        }
        // キャノン発射ブロック生成ロジック
        function handleCanonChanges(row, state) {
            // キャノンの状態確認
            if (state.Canon != row.Canon) {
                const Canon_block = workspace.newBlock('canon_fire');
                Canon_block.setFieldValue(row.Canon.toString(), "STATE");
                Canon_block.initSvg();
                Canon_block.render();
                connectToStartChain(workspace, Canon_block);

                state.Canon = row.Canon;
            }
        }
        const moveMap = {
            "1000": "UP",        // 前進
            "0100": "DOWN",      // 後退
            "0010": "LEFT",      // 左
            "0001": "RIGHT",     // 右
            "1010": "UPLEFT",    // 前進左斜め
            "1001": "UPRIGHT",   // 前進右斜め
            "0110": "DOWNLEFT",  // 後退左斜め
            "0101": "DOWNRIGHT", // 後退右斜め
            "0000": ""           // 停止
        };
        function getOptimalTimeUnit(ms) {
            if (ms >= 60000 && ms % 60000 === 0) {
                return { value: ms / 60000, unit: "MIN" };
            } else if (ms >= 100 && ms % 100 === 0) {
                return { value: ms / 1000, unit: "SEC" };
            } else {
                return { value: ms, unit: "MS" };
            }
        }
        function handleMotorChanges(row, state) {
            // CSVの1or0列を文字列に変換
            const key = `${row.Up}${row.Down}${row.Left}${row.Right}`;
            const optimal = getOptimalTimeUnit(row.duration_ms);
            const move = moveMap[key];
            if (move === undefined) {
                console.warn(`無効な移動フラグ: ${key} 行は停止として処理`);
                const motorBlock = workspace.newBlock('motor_control');
                motorBlock.setFieldValue("", "DIR");
                motorBlock.setFieldValue(optimal.value, "TIME");
                motorBlock.setFieldValue(optimal.unit, "UNIT");
                motorBlock.initSvg();
                motorBlock.render();
                connectToStartChain(workspace, motorBlock);
                return;
            }

            const motorBlock = workspace.newBlock('tank_move');
            motorBlock.setFieldValue(move, "DIR");
            motorBlock.setFieldValue(optimal.value, "TIME");
            motorBlock.setFieldValue(optimal.unit, "UNIT");
            motorBlock.initSvg();
            motorBlock.render();
            connectToStartChain(workspace, motorBlock);

            // 状態更新
            state.Up = row.Up;
            state.Right = row.Right;
            state.Down = row.Down;
            state.Left= row.Left;
            state.duration_ms = row.duration_ms;
        }

        //スタートの下にブロック追加
        function connectToStartChain(workspace, newBlock) {
            const allBlocks = workspace.getAllBlocks(false);
            const startBlock = allBlocks.find(b => b.type === 'start_block');
            if (!startBlock) return;

            // 末尾ブロックを探す
            let last = startBlock;
            while (last.getNextBlock()) {
                last = last.getNextBlock();
            }

            // 接続口
            const targetConnection = last.nextConnection;
            if (!targetConnection || !newBlock.previousConnection) return;

            // 論理接続のみ
            targetConnection.connect(newBlock.previousConnection);

            // 親ブロックに接続されると moveBy は不要
            newBlock.render();
        }