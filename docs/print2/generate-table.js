window.addEventListener("DOMContentLoaded", () => {
    const div = document.querySelector(".gen-table");
    if (!div) return;

    // テキストを配列化
    const numbers = div.textContent.trim().split(/\s+/).map(Number);

    const numLarge = numbers[0];          // 大問の数
    const smallCounts = numbers.slice(1); // 各大問の小問数

    // 大問数と小問情報の整合性チェック
    if (smallCounts.length !== numLarge) {
        console.error("大問数と小問数の項目が一致しません");
        return;
    }

    // 全問題をフラットな配列にする
    const problems = [];
    for (let L = 1; L <= numLarge; L++) {
        for (let S = 1; S <= smallCounts[L - 1]; S++) {
            problems.push(`${L}.${S}`);
        }
    }

    // table 要素生成
    const table = document.createElement("table");
    table.border = "1";

    // 2列ずつ入れる
    for (let i = 0; i < problems.length; i += 2) {
        const tr = document.createElement("tr");

        // 1列目
        const td1 = document.createElement("td");
        td1.textContent = problems[i];
        tr.appendChild(td1);

        // 2列目（存在する場合のみ）
        const td2 = document.createElement("td");
        td2.textContent = problems[i + 1] ?? "";
        tr.appendChild(td2);

        table.appendChild(tr);
    }

    // 出力場所へ挿入
    document.getElementById("output").appendChild(table);
});
