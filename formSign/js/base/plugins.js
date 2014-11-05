(function ($) {
    /*Плагин для получения и задания границ выделения текста или позиции курсора в input:text и textarea
     .range() возвращает координаты начала и конца выделения [start, end] для первого элемента в наборе, который является input:text или textarea
     .range([start, end]) выделяет заданный диапазон в первом элементе из набора, который является input:text или textarea
     если start = end, то возвращается или задается позиция курсора
     если элемент не имел фокуса, он его получит)
     */

    function Range() {
    }

    $.extend(Range.prototype, {
        getRange: function (obj) {
            if (obj === undefined) return [-1, -1];
            obj.focus();
            var selection = document.selection;
            if (selection) {
                var tagName = obj.tagName.toLowerCase(),
                    range = selection.createRange(),
                    len = range.htmlText.length,
                    end;
                if (tagName == "input") {
                    range.moveStart('textedit', -1);
                    end = range.text.length;
                    return [end - len, end];
                }
                if (tagName == "textarea") {
                    var slider = range.duplicate();
                    slider.moveToElementText(obj);
                    slider.collapse();
                    var start = 0;
                    while (!range.inRange(slider)) {
                        slider.move('character', 1);
                        start++;
                    }
                    end = start;
                    while (range.inRange(slider)) {
                        slider.move('character', 1);
                        end++;
                    }
                    return [start, end - 1];
                }
                return [-1, -1];
            }
            var selectionStart = obj.selectionStart;
            if (selectionStart !== undefined) {
                return [selectionStart, obj.selectionEnd];
            }
            return [-1, -1];
        },
        setRange: function (obj, pos) {
            if (obj === undefined) return false;
            obj.focus();
            var start = pos[0],
                end = pos[1],
                len = obj.value.length;
            end = (end === undefined || end > len) ? len : end;
            start = start < 0 ? 0 : start;
            if (obj.selectionStart !== undefined) {
                obj.setSelectionRange(start, end);
                return true;
            }
            if (obj.createTextRange) {
                var range = obj.createTextRange();
                range.move("character", start);
                range.moveEnd("character", end - start);
                range.select();
                return true;
            }
            return false;
        }
    });

    $.fn.range = function (position) {
        if (position === undefined || typeof position != "object" || (position.length != 2 && position.length != 1))
            return $.range.getRange($(this).filter("textarea, input:text").get(0));
        else
            return $.range.setRange($(this).filter("textarea, input:text").get(0), position);
    };

    $.range = new Range();
})($x);