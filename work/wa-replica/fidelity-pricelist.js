  // ============================================================================
  // The price list (plan 037). A person uploads an Excel or CSV file on the page "价格表"; the file is read in the
  // browser (pricefile.js) and its products replace the list. In a conversation the button "报价" beside the
  // message box finds products; the products ticked there are checked in a confirm window — quantity, unit price,
  // amount and total — and go into the message box together (plans 078, 080). Nothing here sends a message, suggests
  // a product by itself or calls a server; a price is shown as the file gives it, with the sign of the currency
  // chosen for the list when it was uploaded (plans 059, 078).
  // ============================================================================
  const PRICE_MESSAGES = {
    'too-large': '文件超过 5 MB，无法作为价格表。',
    'too-long': '价格表的内容过多，请精简后再上传。',
    'too-many-rows': '价格表的行数过多，请拆分或精简后再上传。',
    'old-excel': '这是旧版 Excel（.xls）文件。请在 Excel 中另存为 .xlsx 或 CSV 后再上传。',
    unreadable: '无法读取这个文件。请上传 Excel（.xlsx）或 CSV 文件。',
    'no-table': '文件里没有找到表格：需要一行表头和至少一行产品。',
    'no-prices': '文件里没有找到价格列：价格一列的内容应为数字。',
  };
  const PRICE_QUOTE_ROWS = 50;
  const priceView = { query: '', quote: '', pending: null, picked: [] };
  ui.pageSizes.prices ||= 20;

  // The list in use: { file, at, by, columns: { code, name, spec, prices: [..] }, rows: [{ code, name, spec, prices }] }.
  function priceList() {
    const list = data.priceList;
    return list && Array.isArray(list.rows) && Array.isArray(list.columns?.prices) ? list : null;
  }
  // Letters and digits only, in lower case: "PRD-A 01" is found by "prda01".
  const priceFold = value => String(value ?? '').toLowerCase().replace(/[\s\-_./]+/g, '');
  // The products that carry every word of the query in their code, name or specification; those whose code
  // starts with the query come first.
  function priceMatches(query, list = priceList()) {
    if (!list) return [];
    const words = String(query || '').trim().split(/\s+/).map(priceFold).filter(Boolean);
    if (!words.length) return list.rows;
    const whole = words.join('');
    const found = list.rows.filter(entry => {
      const hay = [entry.code, entry.name, entry.spec].map(priceFold).join(' ');
      return words.every(word => hay.includes(word));
    });
    return [...found.filter(entry => priceFold(entry.code).startsWith(whole)), ...found.filter(entry => !priceFold(entry.code).startsWith(whole))];
  }
  // The currency a price column's header names: "Price ($)" gives "$40", "USD" gives "USD 40", none gives "40".
  // A price that carries its own sign in the file ("$40") stays as it is.
  const PRICE_CURRENCY = /US\$|HK\$|[$€£¥₹₽₩₫฿]|\b(?:USD|EUR|GBP|CNY|RMB|HKD|JPY|AUD|CAD|SGD|MXN|BRL|INR|AED|SAR)\b/i;
  const PRICE_CURRENCY_WORDS = [[/美元|美金/, '$'], [/欧元/, '€'], [/英镑/, '£'], [/人民币/, '¥']];
  function priceMoney(label, value) {
    const sign = PRICE_CURRENCY.exec(label || '')?.[0] || PRICE_CURRENCY_WORDS.find(([word]) => word.test(label || ''))?.[1] || '';
    return !sign || /[$€£¥]/.test(value) ? value : /^[A-Za-z]{3}$/.test(sign) ? `${sign.toUpperCase()} ${value}` : sign + value;
  }
  // What a price column is called once the currency is taken out of its header: "100+ ($)" is "100+".
  const priceColumnName = label => String(label || '').replace(PRICE_CURRENCY, '').replace(/[（(]\s*[）)]/g, '').replace(/\s+/g, ' ').trim();
  // The currency of the whole list, chosen in the confirm dialog of an upload (plan 059): one of these codes, or ''
  // for none. The choice starts on the currency the price columns' headers name. A list saved before the choice
  // existed has no currency and shows every price in the currency its own column's header names, as before.
  const PRICE_CURRENCIES = [['USD', '美元'], ['EUR', '欧元'], ['CNY', '人民币'], ['GBP', '英镑'], ['HKD', '港币'], ['JPY', '日元'], ['AUD', '澳元'], ['CAD', '加元'], ['SGD', '新加坡元'], ['MXN', '墨西哥比索'], ['BRL', '巴西雷亚尔'], ['INR', '印度卢比'], ['AED', '阿联酋迪拉姆'], ['SAR', '沙特里亚尔'], ['RUB', '俄罗斯卢布'], ['KRW', '韩元'], ['VND', '越南盾'], ['THB', '泰铢']];
  const PRICE_SIGN_CODES = { 'US$': 'USD', 'HK$': 'HKD', $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'CNY', '₹': 'INR', '₽': 'RUB', '₩': 'KRW', '₫': 'VND', '฿': 'THB', RMB: 'CNY' };
  // The sign that stands for the list's currency in front of a price (plan 078): "$40", not "USD 40". The other
  // dollars and the yen have signs of their own, so that "$" always means US dollars; a currency without a common
  // sign (AED, SAR) keeps its code: "AED 40".
  const PRICE_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: 'JP¥', HKD: 'HK$', AUD: 'A$', CAD: 'C$', SGD: 'S$', MXN: 'MX$', BRL: 'R$', INR: '₹', RUB: '₽', KRW: '₩', VND: '₫', THB: '฿' };
  // The currency a header names, as a code: "Price ($)" gives USD, "售价（人民币）" gives CNY, "售价" gives ''.
  function priceHeaderCurrency(label) {
    const sign = PRICE_CURRENCY.exec(label || '')?.[0]?.toUpperCase();
    const word = PRICE_CURRENCY_WORDS.find(([pattern]) => pattern.test(label || ''))?.[1];
    return sign ? PRICE_SIGN_CODES[sign] || sign : PRICE_SIGN_CODES[word] || '';
  }
  const priceCurrencyLabel = code => `${code} ${PRICE_CURRENCIES.find(([known]) => known === code)?.[1] || ''}`.trim();
  // A price as the page shows and quotes it: with the sign of the list's currency ("$40"; plan 078), or with none
  // when none was chosen. A price that carries its own sign in the file ("$40") stays as it is.
  function priceShown(list, at, value) {
    if (list.currency === undefined) return priceMoney(list.columns.prices[at], value);
    return list.currency && !/[$€£¥]/.test(value) ? (PRICE_SYMBOLS[list.currency] || list.currency + ' ') + value : value;
  }
  // A price column's head: as the file names it; once a currency was chosen for the list, without the header's own
  // currency and with the chosen one: "Price ($)" with EUR chosen is "Price（EUR）".
  const priceHead = (list, label, i) => (list.currency === undefined ? label || `价格 ${i + 1}` : `${priceColumnName(label) || `价格 ${i + 1}`}${list.currency ? `（${list.currency}）` : ''}`);
  const priceHeads = list => [list.columns.code || '简称', ...(list.columns.name ? [list.columns.name] : []), ...(list.columns.spec ? [list.columns.spec] : []), ...list.columns.prices.map((label, i) => priceHead(list, label, i))];
  const priceCells = (list, entry) => [entry.code, ...(list.columns.name ? [entry.name] : []), ...(list.columns.spec ? [entry.spec] : []), ...list.columns.prices.map((label, i) => entry.prices[i] || '')];
  // The line of a product, e.g. "Product Alpha PRDA01 (100*10 Units): $40", with the list's price or the unit price
  // given in the confirm window (plan 080). With several price columns the line says which one: "... : $10.5 (100+)".
  function priceLine(list, entry, at, value = entry.prices[at]) {
    const label = list.columns.prices[at] || '';
    const column = list.columns.prices.length > 1 ? priceColumnName(label) : '';
    return `${[entry.name, entry.code].filter(Boolean).join(' ')}${entry.spec ? ` (${entry.spec})` : ''}: ${priceShown(list, at, value)}${column ? ` (${column})` : ''}`;
  }
  // Figures of the confirm window (plan 080): a price of the file as a number ("1,200.50" is 1200.5; none is NaN),
  // a number as the page writes it (at most two decimals, none when whole: 400, 37.5), a quantity (a whole number,
  // at least 1) and a unit price (a number) as typed, and the amount of a product.
  const priceNumber = value => { const text = String(value ?? '').replace(/[^\d.]/g, ''); return text ? Number(text) : NaN; };
  const priceFigure = number => (Number.isFinite(number) ? String(Number(number.toFixed(2))) : '');
  const priceValid = item => /^\d+$/.test(item.qty) && Number(item.qty) >= 1 && /^\d+(\.\d+)?$/.test(item.price);
  const priceAmount = item => Number(item.qty) * Number(item.price);

  // ---- page: #prices (价格表) ----
  function priceTableHTML() {
    const list = priceList();
    const found = priceMatches(priceView.query, list);
    const heads = ['序号', ...(list ? priceHeads(list) : ['简称', '名称', '规格', '价格'])].map(esc);
    const rows = paged(found, 'prices').map((entry, i) => `<tr><td>${rowNumber('prices', i)}</td>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('');
    return fidTable('price-table', heads, rows, list ? '没有匹配的产品' : '还没有价格表。请上传 Excel（.xlsx）或 CSV 文件。', true, 'FileText') + fidPager(found.length, 'prices', [20, 50, 100]);
  }
  function renderPriceList() {
    const list = priceList();
    const about = list
      ? `当前价格表：${list.file || '未命名文件'}，共 ${list.rows.length} 个产品${list.currency === undefined ? '' : list.currency ? `，售价币种 ${priceCurrencyLabel(list.currency)}` : '，售价不显示币种'}，${fidDate(list.at)} 由 ${member(list.by)?.name || list.by || '—'} 上传`
      : '尚未上传价格表';
    return `<section class="fid-page"><div class="fid-panel price-panel">
      ${fidHead('价格表', '上传一份 Excel（.xlsx）或 CSV 文件作为价格表。在聊天界面点击消息框旁的「报价」，即可查找产品并把价格放入消息框；消息仍由你确认后发送。')}
      <div class="fid-actions price-toolbar">
        ${fidButton('上传价格表', 'priceUpload', 'File', 'blue')}
        <input type="file" id="price-file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
        <input type="search" class="fid-input" id="price-search" aria-label="搜索价格表" placeholder="搜索简称 / 名称 / 规格" value="${esc(priceView.query)}" ${list ? '' : 'disabled'}>
        ${list ? fidButton('彻底删除价格表', 'priceClear', 'Trash2') : ''}
        <span class="fid-small-note" id="price-about">${esc(about)}</span>
      </div>
      <p class="price-note">文件要求：一张表，第一行为表头；内容为数字的列会被识别为价格（可以有多列），其余各列从左到右依次为产品简称、名称、规格。新上传的文件会替换当前价格表。</p>
      <div class="fid-table-card" id="price-table-card">${priceTableHTML()}</div>
    </div></section>`;
  }
  function priceRefreshTable() {
    const card = $('#price-table-card');
    if (!card) return;
    card.innerHTML = priceTableHTML();
    paintIcons(card);
  }
  const priceProblem = code => fidDialog('无法使用这个文件', `<div class="modal-body"><p>${esc(PRICE_MESSAGES[code] || PRICE_MESSAGES.unreadable)}</p></div>`, fidButton('知道了', 'close', '', 'blue'));
  // A file was chosen: read it here in the browser and show what was found before anything is replaced.
  async function priceRead(file) {
    if (!file) return;
    if (file.size > window.WA_PRICE_FILE.LIMITS.bytes) return priceProblem('too-large');
    let list;
    try {
      list = await window.WA_PRICE_FILE.read(new Uint8Array(await file.arrayBuffer()));
    } catch (problem) {
      return priceProblem(problem?.code);
    }
    priceView.pending = { file: String(file.name || '').slice(0, 120), columns: list.columns, rows: list.rows };
    const heads = priceHeads(list).map(esc), first = list.rows.slice(0, 5);
    const names = [['简称', list.columns.code], ['名称', list.columns.name], ['规格', list.columns.spec], ['价格', list.columns.prices.join('、')]].filter(([, label]) => label);
    const start = list.columns.prices.map(priceHeaderCurrency).find(Boolean) || '';
    fidDialog('确认价格表', `<div class="modal-body price-preview">
      <p>文件：<strong>${esc(priceView.pending.file)}</strong></p>
      <p>读取到 <strong>${list.rows.length}</strong> 个产品${list.skipped ? `，另有 ${list.skipped} 行没有价格，已略过` : ''}。各列按表头识别为：${names.map(([name, label]) => `${name} = ${esc(label)}`).join('；')}。</p>
      ${fidFormRow('售价币种', `<select class="fid-select" id="price-currency">${option('', '不显示币种', start)}${PRICE_CURRENCIES.map(([code]) => option(code, priceCurrencyLabel(code), start)).join('')}</select><span class="fid-field-help">报价时每个价格前都带上这个币种的符号，例如「$40」；没有通用符号的币种写代码，例如「AED 40」。${start ? '已按表头选好，可以更改。' : ''}</span>`, 'price-currency')}
      <div class="fid-table-scroll"><table class="fid-table price-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead><tbody>${first.map(entry => `<tr>${priceCells(list, entry).map(cell => `<td>${esc(cell || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="price-note">${list.rows.length > first.length ? `以上为前 ${first.length} 个产品。` : ''}确认后将${priceList() ? '替换当前价格表' : '作为价格表使用'}。</p>
    </div>`, fidButton('确认使用', 'priceUse', '', 'blue') + fidButton('取 消', 'close'), true);
  }

  // ---- conversation: the button "报价" and its dialog ----
  // Called by the message box (see build-fidelity.cjs); a function declaration, so it exists from the start.
  function priceQuoteButton() {
    return `<button type="button" class="price-quote-button" data-action="priceQuote" aria-label="报价" title="从价格表选择产品，把价格放入消息框">${icon('ListOrdered')}<span>报价</span></button>`;
  }
  function priceQuoteRows() {
    const list = priceList();
    if (!list) return `<div class="price-quote-empty"><p>还没有价格表。</p>${fidButton('去上传价格表', 'priceOpenPage', 'File', 'blue')}</div>`;
    const found = priceMatches(priceView.quote, list);
    if (!found.length) return '<div class="price-quote-empty"><p>没有匹配的产品</p></div>';
    const several = list.columns.prices.length > 1;
    const rows = found.slice(0, PRICE_QUOTE_ROWS).map(entry => {
      // A box on the left ticks the product (plan 080); its prices are shown, and chosen in the confirm window.
      const row = list.rows.indexOf(entry), picked = priceView.picked.some(item => item.row === row);
      const prices = entry.prices.map((value, at) => (value ? `<span>${several && priceColumnName(list.columns.prices[at]) ? `<small>${esc(priceColumnName(list.columns.prices[at]))}</small> ` : ''}${esc(priceShown(list, at, value))}</span>` : '')).join('');
      return `<li class="price-quote-row"><label class="price-quote-product"><input type="checkbox" data-price-pick="${row}" ${picked ? 'checked' : ''}><strong>${esc(entry.code)}</strong>${entry.name ? ` <span>${esc(entry.name)}</span>` : ''}${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}</label><span class="price-quote-prices">${prices}</span></li>`;
    }).join('');
    const more = found.length - PRICE_QUOTE_ROWS;
    return `<ul class="price-quote-list">${rows}</ul>${more > 0 ? `<p class="price-note">还有 ${more} 个产品未显示，请继续输入以缩小范围。</p>` : ''}`;
  }
  // Says how many products are ticked; 确认 needs at least one.
  function priceQuoteCount() {
    const count = $('#price-quote-count'), button = $('#price-quote-confirm');
    if (count) count.textContent = `已选 ${priceView.picked.length} 项`;
    if (button) button.disabled = !priceView.picked.length;
  }
  // The list to tick products in, with the ticks and the search as they are (opened anew, or back from the confirm
  // window). priceView.picked holds the ticked products in the order ticked: { row, at, qty, price } — the price
  // column and, as typed, the quantity and the unit price.
  function priceQuoteShow() {
    fidDialog('报价', `<div class="modal-body price-quote">
      <input type="search" class="fid-input" id="price-quote-search" aria-label="查找产品" placeholder="输入产品简称或名称查找" value="${esc(priceView.quote)}" ${priceList() ? '' : 'disabled'}>
      <p class="price-note">勾选左侧方框选择产品，可以多选；查找其他产品时，已选的保留。点击「确认」后核对数量和单价，再放入消息框，不会自动发送。</p>
      <div id="price-quote-rows">${priceQuoteRows()}</div>
    </div>`, `<span class="fid-small-note" id="price-quote-count">已选 ${priceView.picked.length} 项</span>${fidButton('确认', 'priceConfirm', '', 'blue', `id="price-quote-confirm" ${priceView.picked.length ? '' : 'disabled'}`)}${fidButton('关 闭', 'close')}`, true);
    $('#price-quote-search')?.focus();
  }
  function priceQuoteOpen() {
    if (!selectedCustomer() || !$('#composer-text')) return;
    Object.assign(priceView, { quote: '', picked: [] });
    priceQuoteShow();
  }
  // The confirm window (plan 080): the ticked products in the order ticked, each with its quantity, its unit price
  // — and, when the list has several price columns, the column — its amount, and the total. A product can be
  // deleted; 返回列表 goes back to the ticks; 放入消息框 needs a valid quantity and unit price for every product.
  function priceConfirmOpen() {
    const list = priceList();
    priceView.picked = priceView.picked.filter(item => list?.rows[item.row]?.prices[item.at]);
    const items = priceView.picked, several = list && list.columns.prices.length > 1, ready = items.length > 0 && items.every(priceValid);
    const rows = items.map((item, i) => {
      const entry = list.rows[item.row];
      const columns = several ? `<select class="fid-select" data-price-tier="${i}" aria-label="价格列">${entry.prices.map((value, at) => (value ? option(String(at), `${priceColumnName(list.columns.prices[at]) || `价格 ${at + 1}`}：${priceShown(list, at, value)}`, String(item.at)) : '')).join('')}</select>` : '';
      return `<tr><td><strong>${esc([entry.name, entry.code].filter(Boolean).join(' '))}</strong>${entry.spec ? ` <small>${esc(entry.spec)}</small>` : ''}${columns}</td>
        <td><input type="number" class="fid-input" min="1" step="1" inputmode="numeric" data-price-qty="${i}" value="${esc(item.qty)}" aria-label="数量"></td>
        <td><input type="number" class="fid-input" min="0" step="any" inputmode="decimal" data-price-unit="${i}" value="${esc(item.price)}" aria-label="单价"></td>
        <td id="price-amount-${i}">${esc(priceValid(item) ? priceShown(list, item.at, priceFigure(priceAmount(item))) : '—')}</td>
        <td>${fidButton('删除', 'priceDrop', '', 'slim', fidActionID(String(i)))}</td></tr>`;
    }).join('');
    const total = ready ? priceShown(list, items[0].at, priceFigure(items.reduce((sum, item) => sum + priceAmount(item), 0))) : '—';
    fidDialog('确认报价', `<div class="modal-body price-quote">${items.length
      ? `<div class="fid-table-scroll"><table class="fid-table price-confirm-table"><colgroup><col><col><col><col><col></colgroup><thead><tr><th scope="col">产品</th><th scope="col">数量</th><th scope="col">单价</th><th scope="col">金额</th><th scope="col"><span class="sr-only">删除</span></th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th scope="row" colspan="3">合计</th><td id="price-confirm-total">${esc(total)}</td><td></td></tr></tfoot></table></div>
      <p class="price-note">数量与单价可以修改，金额与合计随之计算。放入消息框后不会自动发送。</p>`
      : '<div class="price-quote-empty"><p>没有选中的产品</p></div>'}</div>`, `${fidButton('返回列表', 'priceBack')}${fidButton('放入消息框', 'priceInsert', '', 'blue', `id="price-confirm-insert" ${ready ? '' : 'disabled'}`)}${fidButton('取 消', 'close')}`, true);
  }
  // The amounts, the total and 放入消息框 follow what is typed in the confirm window.
  function priceConfirmTotals() {
    const list = priceList(), items = priceView.picked, ready = items.length > 0 && items.every(priceValid);
    items.forEach((item, i) => { const cell = $(`#price-amount-${i}`); if (cell) cell.textContent = priceValid(item) ? priceShown(list, item.at, priceFigure(priceAmount(item))) : '—'; });
    const total = $('#price-confirm-total');
    if (total) total.textContent = ready ? priceShown(list, items[0].at, priceFigure(items.reduce((sum, item) => sum + priceAmount(item), 0))) : '—';
    const button = $('#price-confirm-insert');
    if (button) button.disabled = !ready;
  }

  Object.assign(fidActions, {
    priceUpload: () => $('#price-file')?.click(),
    priceUse: () => {
      const pending = priceView.pending;
      if (!pending) return;
      const chosen = $('#price-currency')?.value || '', currency = PRICE_CURRENCIES.some(([code]) => code === chosen) ? chosen : '';
      data.priceList = { file: pending.file, at: new Date().toISOString(), by: ui.persona, currency, columns: pending.columns, rows: pending.rows };
      Object.assign(priceView, { pending: null, query: '' });
      ui.pages.prices = 0;
      persist();
      close();
      render();
      toast(`价格表已更新，共 ${pending.rows.length} 个产品${currency ? `，售价币种 ${currency}` : ''}。`);
    },
    priceClear: () => { if (priceList()) fidConfirm('彻底删除价格表', '价格表会从系统中彻底删除：页面上、服务器保存的数据和保存记录里都不再留下它，无法恢复。删除后，聊天界面的「报价」将没有可选的产品；已经放进消息或草稿里的报价不受影响。确认彻底删除？', 'priceClearDo'); },
    // The server takes the list out with every trace of it (WA_SITE.purge); only then is it gone from the page.
    priceClearDo: async () => {
      close();
      if (!(await window.WA_SITE.purge('priceList'))) return toast('价格表没有删除：暂时无法连接服务器，请稍后重试。');
      Object.assign(priceView, { pending: null, query: '' });
      render();
      toast('价格表已彻底删除，没有留下记录。');
    },
    priceQuote: priceQuoteOpen,
    priceOpenPage: () => { close(); navigate('prices'); },
    priceConfirm: () => { if (priceView.picked.length) priceConfirmOpen(); },
    priceBack: priceQuoteShow,
    priceDrop: id => {
      priceView.picked.splice(Number(id), 1);
      priceConfirmOpen();
    },
    // Puts one line per product — "Product Alpha PRDA01: $40 x 10 = $400" — and the total at the end of the message
    // box, in the order the products were ticked (plan 080). The message is not sent.
    priceInsert: () => {
      const list = priceList(), box = $('#composer-text'), items = priceView.picked;
      if (!list || !box || !items.length || !items.every(item => priceValid(item) && list.rows[item.row]?.prices[item.at])) return;
      const lines = items.map(item => `${priceLine(list, list.rows[item.row], item.at, priceFigure(Number(item.price)))} x ${item.qty} = ${priceShown(list, item.at, priceFigure(priceAmount(item)))}`);
      lines.push(`Total: ${priceShown(list, items[0].at, priceFigure(items.reduce((sum, item) => sum + priceAmount(item), 0)))}`);
      close();
      priceView.picked = [];
      const before = box.value.replace(/\s+$/, '');
      box.value = (before ? before + '\n' : '') + lines.join('\n');
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    },
  });

  document.addEventListener('change', event => {
    if (event.target.id !== 'price-file') return;
    const file = event.target.files?.[0];
    event.target.value = '';
    priceRead(file);
  });
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'price-search') {
      priceView.query = input.value;
      ui.pages.prices = 0;
      priceRefreshTable();
    } else if (input.id === 'price-quote-search') {
      priceView.quote = input.value;
      const rows = $('#price-quote-rows');
      rows.innerHTML = priceQuoteRows();
      paintIcons(rows);
    } else if (input.dataset.priceQty !== undefined || input.dataset.priceUnit !== undefined) {
      const item = priceView.picked[Number(input.dataset.priceQty ?? input.dataset.priceUnit)];
      if (!item) return;
      item[input.dataset.priceQty !== undefined ? 'qty' : 'price'] = input.value.trim();
      priceConfirmTotals();
    }
  });
  // A product ticked or unticked in the list (it starts with quantity 1 and the price of its first price column), or
  // another price column chosen for a product in the confirm window (its unit price becomes that column's).
  document.addEventListener('change', event => {
    const input = event.target, list = priceList();
    if (input.dataset?.pricePick !== undefined) {
      const row = Number(input.dataset.pricePick), entry = list?.rows[row], at = entry ? entry.prices.findIndex(Boolean) : -1;
      priceView.picked = priceView.picked.filter(item => item.row !== row);
      if (input.checked && at >= 0) priceView.picked.push({ row, at, qty: '1', price: priceFigure(priceNumber(entry.prices[at])) });
      priceQuoteCount();
    } else if (input.dataset?.priceTier !== undefined) {
      const item = priceView.picked[Number(input.dataset.priceTier)], at = Number(input.value), value = item && list?.rows[item.row]?.prices[at];
      if (!value) return;
      Object.assign(item, { at, price: priceFigure(priceNumber(value)) });
      priceConfirmOpen();
    }
  });
