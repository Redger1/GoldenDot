function CBR_XML_Daily_Ru(rates) {
    const currencyCode = document.querySelector('.currency-code');
    const currencyInRub = document.querySelector('.currency-in-rub');
    const dayDiff = document.querySelector('.day-diff');

    currencyCode.innerHTML = "";
    currencyInRub.innerHTML = "";
    dayDiff.innerHTML = ""

    for (let currency in rates.Valute) {
        const value = rates.Valute[currency]["Value"];
        const previousValue = rates.Valute[currency]["Previous"];
        const currencyName = rates.Valute[currency]["Name"];
        const currencyNominal = rates.Valute[currency]["Nominal"];
        const currencyID = rates.Valute[currency]["CharCode"]
        let difference = (100 - (value / previousValue * 100)).toFixed(4);

        currencyCode.innerHTML += `
            <a
                href="#popup"
                data-history="${currencyID}"
                data-tooltip="${currencyName}"
                class="list__item currency-code__item popup__link"
            >
                ${currency}
            </a>`
        currencyInRub.innerHTML += `<p class="list__item">${(value / currencyNominal).toFixed(4)}</p>`
        if (value < previousValue) {
            dayDiff.innerHTML += `<p class="list__item">-${difference}</p>`
        } else {
            dayDiff.innerHTML += `<p class="list__item">${difference}</p>`
        }
    }

    // Tooltip
    const currencyCodeItem = document.querySelectorAll('.currency-code__item');

    // Мне пришлось отказаться от всплытия метода mouseover
    // и пожертвовать производтельностью. Значит придется использовать событие
    // mouseenter и навешивать его на каждый элемент в цикле

    for (let i = 0; i < currencyCodeItem.length; i++) {
        currencyCodeItem[i].addEventListener('mouseenter', showTooltip);
        currencyCodeItem[i].addEventListener('mouseleave', hideTooltip);
    }

    function showTooltip(event) {
        const div = document.createElement('div');
        div.classList.add('tooltip__item');
        div.innerText = event.target.dataset.tooltip
        event.target.append(div);
    }

    function hideTooltip() {
        const div = document.querySelector('.tooltip__item');
        div.remove()
    }

    let count = 0;
    let objArr = [];

    let promise = new Promise((resolve, reject) => {
        async function ExecuteRequest(url) {
            try {
                await fetch(url).then(response => {
                    response.json().then(data => {
                        count++
                        if (count <= 10) {
                            objArr.push(data);
                            ExecuteRequest(data.PreviousURL);
                        } else resolve(objArr)
                    })
                })
            }
            catch (error) { reject(error) }
        }
        ExecuteRequest(rates.PreviousURL)
    })

    promise.then(
        result => { // result = массиву объектов с историей всех валют за 10 дней
            for (let i = 0; i < currencyCodeItem.length; i++) {
                currencyCodeItem[i].addEventListener("click", showHistory);
            }

            function showHistory(event) {
                let allValues = [];
                const targetCurrency = event.target;

                result.forEach(element => {
                    let shortNameCurrency = event.target.dataset.history;
                    let oldValue = element.Valute[shortNameCurrency]["Value"]
                    let oldNominal = element.Valute[shortNameCurrency]["Nominal"]
                    
                    let resultValues = (oldValue / oldNominal).toFixed(4)
                    allValues.push(resultValues);
                });
                getShowHistory(allValues, targetCurrency)
            }
            
            // Выводим данные на попап
            function getShowHistory(resultValues, targetCurrency) {
                const popupText = document.querySelector('.popup__text');
                const popupTitle = document.querySelector('.popup__title');
                const titleCurrencyID = targetCurrency.dataset.history;

                let dates = [];
                result.forEach(element => {
                    dates.push(element["Date"]);
                })

                popupText.innerText = ''
                if (dates.length == resultValues.length) {
                    resultValues.forEach((elem, index) => {
                        const currentDate = dates[index].substr(0, 10);
                        popupTitle.innerHTML = `История <i>${titleCurrencyID}</i> за 10 дней`
                        popupText.innerHTML += `
                            <div class="history__item">
                                <span class="popup__date">${currentDate}:</span>
                                <p class="history-value"><b>${elem}</b> <i>руб</i></p>
                            </div>
                        `;
                    })
                } else {
                    popupText.innerHTML = `ERROR`;
                    console.log("Что-то пошло не так");
                }
                
            }

            // Попап

            const popupLinks = document.querySelectorAll('.popup__link');
            const body = document.querySelector('body');

            let unlock = true; // Переменная для блокировки скролла

            const timeout = 800;

            // Этот цикл нужнен для открытия разных попапов с разных ссылок
            if (popupLinks.length > 0) {
                for (let index = 0; index < popupLinks.length; index++) {
                    const popupLink = popupLinks[index];
                    popupLink.addEventListener("click", function(e) {
                        const popupName = popupLink.getAttribute("href").replace("#", '');
                        const currentPopup = document.getElementById(popupName);
                        popupOpen(currentPopup);
                        e.preventDefault();
                    });
                }
            }

            const popupCloseIcon = document.querySelectorAll('.close-popup');

            // Добавления прослушивателя Click на все все ссылки закрытия попапа
            if (popupCloseIcon.length > 0) {
                for (let index = 0; index < popupCloseIcon.length; index++) {
                    const el = popupCloseIcon[index];
                    el.addEventListener('click', function(e) {
                        popupClose(el.closest('.popup'));
                        e.preventDefault();
                    });
                }
            }

            function popupOpen(currentPopup) {
                if (currentPopup && unlock) {
                    const popupActive = document.querySelector('.popup.open');
                    if (popupActive) { // Перед открытием закрываем все актвные попапы
                        popupClose(popupActive, false);
                    } else {
                        bodyLock();
                    }
                    currentPopup.classList.add('open');
                    // Если кликаем на что угодно, кроме тела попапа, то он закроется
                    currentPopup.addEventListener('click', function(e) { 
                        if (!e.target.closest('.popup__content')) {
                            popupClose(e.target.closest('.popup'));
                        }
                    });
                }
            }

            function popupClose(popupActive, doUnlock = true) {
                if (unlock) {
                    popupActive.classList.remove('open');
                    if (doUnlock) {
                        bodyUnlock();
                    }
                }
            }

            // Высчитываем ширину скролла и добавляем это значение в свойство "padding-right"
            // Чтобы страница не "дергалась" при открытии попапа
            // И лочим body, чтобы нельзя было скролить страницу при открытом попапе
            function bodyLock() {
                const lockPaddingValue = window.innerWidth - document.querySelector('.wrapper').offsetWidth + 'px';
                body.style.paddingRight = lockPaddingValue;
                body.classList.add('lock');
            }

            function bodyUnlock() {
                setTimeout(function () {
                    body.style.paddingRight = '0px';
                    body.classList.remove('lock');
                }, timeout);

                unlock = false;
                setTimeout(function () {
                    unlock = true;
                }, timeout)
            }

            // Закрыте попапа кнопкой Esc
            document.addEventListener('keydown', function (e) {
                if (e.key === "Escape") {
                    const popupActive = document.querySelector('.popup.open');;
                    popupClose(popupActive);
                }
            });

            // Все setTimeout в функциях для попапа нужны для того, чтобы
            // Предотвратить повторное открытие/закрытие и дождаться окончания анимации попапа
        },
        error => {
            console.log(error)
        }
    )
}
