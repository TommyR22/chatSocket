(function () {

  // FINAL_START
  const { Observable, fromEvent, empty, timer } = rxjs;
  const { ajax } = rxjs.ajax;
  const { webSocket } = rxjs.webSocket;
  const { debounceTime, map, switchMap, catchError, retryWhen } = rxjs.operators;
  // FINAL_END

  // the div containing the search suggestion results
  const suggestions = document.querySelector('#suggestions');

  // the div containing the selected tickers
  const tickers = document.querySelector('#tickers');

  // the search input element
  const q = document.querySelector('#q');

  // a function to get the search results URL
  const getSearchURL = (query) => `/search?q=${query}`;
  // ---------------------------------------------------------

  // FINAL_START
  fromEvent(q, 'input').pipe(
    debounceTime(500),
    map(e => e.target.value),
    map(q => getSearchURL(q)),
    switchMap(url =>
      ajax.getJSON(url).pipe(
        catchError(err => empty()),
      )
    ),
  ).subscribe(results => showSuggestions(results));
  // FINAL_END

  // FINAL_START
  const webSocket$ = webSocket('ws://localhost:8080');
  // FINAL_END

  function getTickerStream(symbol) {
    // FINAL_START
    return webSocket$.multiplex(
      () => ({ type: 'sub', symbol }),
      () => ({ type: 'unsub', symbol }),
      x => x.symbol === symbol
    )
    .pipe(
      map(x => x.price),
      retryWhen(switchMap(() => timer(1000)))
    );
    // FINAL_END
  };

  // ***************************************************************************
  // ***************************************************************************
  // ***************************************************************************
  // Hacky render code past here. Just for demoing purposes. Not best practice!
  // ***************************************************************************
  // ***************************************************************************
  // ***************************************************************************

  function showSuggestions(results) {
    let html = '<ul>';
    results.forEach(({ symbol, name }) => {
      html += `<li>
        <a href="javascript:selectSymbol('${symbol}')">
          ${symbol} - ${name}
        </a>
      </li>`;
    })
    html += '</ul>';

    suggestions.innerHTML = html;
    return html;
  };

  // a hook that is called when a symbol is selected from the suggestions.
  function selectSymbol(symbol) {
    addTicker(symbol);
    suggestions.innerHTML = '';
  };

  function addTicker(symbol) {
    const id = 'ticker-' + symbol;
    if (document.querySelector('#' + id)) {
      return;
    }
    const ticker = document.createElement('x-ticker-display');
    ticker.id = id;
    ticker.title = symbol;
    ticker.data = getTickerStream(symbol);
    tickers.appendChild(ticker);
  };

  window.selectSymbol = selectSymbol;
} ());
