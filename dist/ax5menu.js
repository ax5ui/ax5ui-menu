"use strict";

// ax5.ui.menu
(function (root, _SUPER_) {

    /**
     * @class ax5.ui.menu
     * @classdesc
     * @version v0.0.1
     * @author tom@axisj.com
     * @example
     * ```
     * var menu = new ax5.ui.menu();
     * ```
     */
    var U = ax5.util;

    //== UI Class
    var axClass = function axClass() {
        var self = this,
            cfg;

        if (_SUPER_) _SUPER_.call(this); // 부모호출

        this.config = {
            theme: "default",
            //width: 200,
            iconWidth: 22,
            acceleratorWidth: 100,
            menuBodyPadding: 5,
            //direction: "top", // top|bottom
            position: { left: 0, top: 0 },
            animateTime: 250,
            items: []
        };

        this.openTimer = null;
        this.closeTimer = null;
        this.queue = [];
        this.menuBar = {};

        cfg = this.config;

        this.init = function () {
            var that;
            // after set_config();
            self.menuId = ax5.getGuid();

            if (cfg.onStateChanged) {
                that = {
                    self: this,
                    state: "init"
                };
                cfg.onStateChanged.call(that, that);
            }
        };

        /** private **/
        this.__getTmpl = function () {
            return "\n            <div class=\"ax5-ui-menu {{theme}}\">\n                <div class=\"ax-menu-body\">\n                    {{#items}}\n                        {{^@isMenu}}\n                            {{#divide}}\n                            <div class=\"ax-menu-item-divide\" data-menu-item-index=\"{{@i}}\"></div>\n                            {{/divide}}\n                            {{#html}}\n                            <div class=\"ax-menu-item-html\" data-menu-item-index=\"{{@i}}\">{{{@html}}}</div>\n                            {{/html}}\n                        {{/@isMenu}}\n                        {{#@isMenu}}\n                        <div class=\"ax-menu-item\" data-menu-item-depth=\"{{@depth}}\" data-menu-item-index=\"{{@i}}\" data-menu-item-path=\"{{@path}}.{{@i}}\">\n                            <span class=\"ax-menu-item-cell ax-menu-item-checkbox\">\n                                {{#check}}\n                                <span class=\"item-checkbox-wrap useCheckBox\" {{#checked}}data-item-checked=\"true\"{{/checked}}></span>\n                                {{/check}}\n                                {{^check}}\n                                <span class=\"item-checkbox-wrap\"></span>\n                                {{/check}}\n                            </span>\n                            {{#icon}}\n                            <span class=\"ax-menu-item-cell ax-menu-item-icon\" style=\"width:{{cfg.iconWidth}}px;\">{{{.}}}</span>\n                            {{/icon}}\n                            <span class=\"ax-menu-item-cell ax-menu-item-label\">{{{label}}}</span>\n                            {{#accelerator}}\n                            <span class=\"ax-menu-item-cell ax-menu-item-accelerator\" style=\"width:{{cfg.acceleratorWidth}}px;\"><span class=\"item-wrap\">{{.}}</span></span>\n                            {{/accelerator}}\n                            {{#@hasChild}}\n                            <span class=\"ax-menu-item-cell ax-menu-item-handle\">{{{cfg.icons.arrow}}}</span>\n                            {{/@hasChild}}\n                        </div>\n                        {{/@isMenu}}\n\n                    {{/items}}\n                </div>\n                <div class=\"ax-menu-arrow\"></div>\n            </div>\n            ";
        };

        /** private **/
        this.__getTmpl_menuBar = function () {
            return "\n            <div class=\"ax5-ui-menubar {{theme}}\">\n                <div class=\"ax-menu-body\">\n                    {{#items}}\n                        {{^@isMenu}}\n                            {{#divide}}\n                            <div class=\"ax-menu-item-divide\" data-menu-item-index=\"{{@i}}\"></div>\n                            {{/divide}}\n                            {{#html}}\n                            <div class=\"ax-menu-item-html\" data-menu-item-index=\"{{@i}}\">{{{@html}}}</div>\n                            {{/html}}\n                        {{/@isMenu}}\n                        {{#@isMenu}}\n                        <div class=\"ax-menu-item\" data-menu-item-index=\"{{@i}}\">\n                            {{#icon}}\n                            <span class=\"ax-menu-item-cell ax-menu-item-icon\" style=\"width:{{cfg.iconWidth}}px;\">{{{.}}}</span>\n                            {{/icon}}\n                            <span class=\"ax-menu-item-cell ax-menu-item-label\">{{{label}}}</span>\n                        </div>\n                        {{/@isMenu}}\n                    {{/items}}\n                </div>\n            </div>\n            ";
        };

        /** private **/
        this.__popup = function (opt, items, depth, path) {
            var data = opt,
                activeMenu,
                that;

            data.theme = opt.theme || cfg.theme;
            data.cfg = {
                icons: jQuery.extend({}, cfg.icons),
                iconWidth: opt.iconWidth || cfg.iconWidth,
                acceleratorWidth: opt.acceleratorWidth || cfg.acceleratorWidth
            };

            items.forEach(function (n) {
                if (n.html || n.divide) {
                    n['@isMenu'] = false;
                    if (n.html) {
                        n['@html'] = n.html.call({
                            item: n,
                            config: cfg,
                            opt: opt
                        });
                    }
                } else {
                    n['@isMenu'] = true;
                }
            });

            data.items = items;
            data['@depth'] = depth;
            data['@path'] = path || "root";
            data['@hasChild'] = function () {
                return this.items && this.items.length > 0;
            };
            activeMenu = jQuery(ax5.mustache.render(this.__getTmpl(), data));
            jQuery(document.body).append(activeMenu);

            // remove queue

            var removed = this.queue.splice(depth);
            removed.forEach(function (n) {
                n.$target.remove();
            });
            this.queue.push({
                '$target': activeMenu
            });

            activeMenu.find('[data-menu-item-index]').bind("mouseover", function () {
                var depth = this.getAttribute("data-menu-item-depth"),
                    index = this.getAttribute("data-menu-item-index"),
                    path = this.getAttribute("data-menu-item-path");

                activeMenu.find('[data-menu-item-index]').removeClass("hover");
                jQuery(this).addClass("hover");
                if (activeMenu.attr("data-selected-menu-item-index") != index) {
                    activeMenu.attr("data-selected-menu-item-index", index);

                    if (items[index].items && items[index].items.length > 0) {

                        var $this = $(this),
                            offset = $this.offset(),
                            childOpt = {
                            '@parent': {
                                left: offset.left,
                                top: offset.top,
                                width: $this.outerWidth(),
                                height: $this.outerHeight()
                            },
                            left: offset.left + $this.outerWidth() - cfg.menuBodyPadding,
                            top: offset.top - cfg.menuBodyPadding - 1
                        };
                        childOpt = jQuery.extend(true, opt, childOpt);
                        self.__popup(childOpt, items[index].items, depth + 1, path);
                    } else {
                        self.queue.splice(Number(depth) + 1).forEach(function (n) {
                            n.$target.remove();
                        });
                    }
                }
            });

            // is Root
            if (depth == 0) {
                if (data.direction) activeMenu.addClass("direction-" + data.direction);
                jQuery(document).bind("click.ax5menu", this.__clickItem.bind(this));
                jQuery(window).bind("keydown.ax5menu", function (e) {
                    if (e.which == ax5.info.eventKeys.ESC) {
                        self.close();
                    }
                });
                jQuery(window).bind("resize.ax5menu", function (e) {
                    self.close();
                });

                if (cfg.onStateChanged) {
                    that = {
                        self: this,
                        state: "popup"
                    };
                    cfg.onStateChanged.call(that, that);
                }
            }

            // console.log(data);

            this.__align(activeMenu, data);
            return this;
        };

        /** click **/
        this.__clickItem = function (e) {
            var target = U.findParentNode(e.target, function (target) {
                if (target.getAttribute("data-menu-item-index")) {
                    return true;
                }
            });
            if (target) {
                // click item
                var item = function (path) {
                    if (!path) return false;
                    var item;
                    try {
                        item = Function("", "return this.config.items[" + path.substring(5).replace(/\./g, '].items[') + "];").call(self);
                    } catch (e) {
                        console.log(ax5.info.getError("ax5menu", "501", "menuItemClick"));
                    }
                    return item;
                }(target.getAttribute("data-menu-item-path"));

                if (!item) return this;

                if (item.check) {
                    (function (items) {
                        var setValue = {
                            'checkbox': function checkbox(value) {
                                this.checked = !value;
                            },
                            'radio': function radio(value) {
                                var name = this.name;
                                items.forEach(function (n) {
                                    if (n.check && n.check.type === 'radio' && n.check.name == name) {
                                        n.check.checked = false;
                                    }
                                });
                                this.checked = true;
                            }
                        };
                        if (setValue[this.type]) setValue[this.type].call(this, this.checked);
                    }).call(item.check, cfg.items);
                }

                if (self.onClick) {
                    self.onClick.call(item, item);
                    if (!item.items || item.items.length == 0) self.close();
                }
                if (cfg.onClick) {
                    cfg.onClick.call(item, item);
                    if (!item.items || item.items.length == 0) self.close();
                }
            } else {
                self.close();
            }
            return this;
        };

        /** private **/
        this.__align = function (activeMenu, data) {
            //console.log(data['@parent']);
            var $window = $(window),
                wh = $window.height(),
                ww = $window.width(),
                h = activeMenu.outerHeight(),
                w = activeMenu.outerWidth(),
                l = data.left,
                t = data.top;

            if (l + w > ww) {
                if (data['@parent']) {
                    l = data['@parent'].left - w + cfg.menuBodyPadding;
                } else {
                    l = ww - w;
                }
            }
            if (t + h > wh) {
                t = wh - h;
            }

            activeMenu.css({ left: l, top: t });

            return this;
        };

        /**
         * @method ax5.ui.menu.popup
         * @param {Event|Object} e - Event or Object
         * @param {Object} [opt]
         * @returns {ax5.ui.menu} this
         */
        this.popup = function () {

            var getOption = {
                'event': function event(e, opt) {
                    e = {
                        left: e.clientX,
                        top: e.clientY,
                        width: cfg.width,
                        theme: cfg.theme
                    };

                    if (cfg.position) {
                        if (cfg.position.left) e.left += cfg.position.left;
                        if (cfg.position.top) e.top += cfg.position.top;
                    }

                    opt = jQuery.extend(true, e, opt);
                    return opt;
                },
                'object': function object(e, opt) {
                    e = {
                        left: e.left,
                        top: e.top,
                        width: e.width || cfg.width,
                        theme: e.theme || cfg.theme
                    };

                    if (cfg.position) {
                        if (cfg.position.left) e.left += cfg.position.left;
                        if (cfg.position.top) e.top += cfg.position.top;
                    }

                    opt = jQuery.extend(true, e, opt);
                    return opt;
                }
            };

            return function (e, opt) {

                if (!e) return this;
                opt = getOption[typeof e.clientX == "undefined" ? "object" : "event"].call(this, e, opt);
                this.__popup(opt, cfg.items, 0); // 0 is seq of queue

                return this;
            };
        }();

        /**
         * @method ax5.ui.menu.attach
         * @param {Element|jQueryObject} el
         * @returns {ax5.ui.menu} this
         */
        this.attach = function () {

            var getOption = {
                'object': function object(e, opt) {
                    e = {
                        left: e.left,
                        top: e.top,
                        width: e.width || cfg.width,
                        theme: e.theme || cfg.theme,
                        direction: e.direction || cfg.direction
                    };
                    opt = jQuery.extend(true, opt, e);
                    return opt;
                }
            };

            var popUpChildMenu = function popUpChildMenu(target, opt) {
                var $target = $(target),
                    offset = $target.offset(),
                    height = $target.outerHeight(),
                    index = Number(target.getAttribute("data-menu-item-index"));

                self.menuBar.target.find('[data-menu-item-index]').removeClass("hover");
                self.menuBar.opened = true;
                $target.attr("data-menu-item-opened", "true");
                $target.addClass("hover");

                if (cfg.position) {
                    if (cfg.position.left) offset.left += cfg.position.left;
                    if (cfg.position.top) offset.top += cfg.position.top;
                }

                opt = getOption["object"].call(this, { left: offset.left, top: offset.top + height }, opt);

                if (cfg.items && cfg.items[index].items && cfg.items[index].items.length) {
                    self.__popup(opt, cfg.items[index].items, 0, 'root.' + target.getAttribute("data-menu-item-index")); // 0 is seq of queue
                }
            };

            return function (el, opt) {
                var data = {};
                var items = cfg.items;

                if (typeof opt === "undefined") opt = {};

                data.theme = opt.theme || cfg.theme;
                data.cfg = {
                    icons: jQuery.extend({}, cfg.icons),
                    iconWidth: opt.iconWidth || cfg.iconWidth,
                    acceleratorWidth: opt.acceleratorWidth || cfg.acceleratorWidth
                };

                items.forEach(function (n) {
                    if (n.html || n.divide) {
                        n['@isMenu'] = false;
                        if (n.html) {
                            n['@html'] = n.html.call({
                                item: n,
                                config: cfg,
                                opt: opt
                            });
                        }
                    } else {
                        n['@isMenu'] = true;
                    }
                });

                data.items = items;

                var activeMenu = jQuery(ax5.mustache.render(this.__getTmpl_menuBar(), data));
                self.menuBar = {
                    target: jQuery(el),
                    opened: false
                };
                self.menuBar.target.html(activeMenu);

                // click, mouseover
                self.menuBar.target.bind("click", function (e) {
                    if (!e) return this;
                    var target = U.findParentNode(e.target, function (target) {
                        if (target.getAttribute("data-menu-item-index")) {
                            return true;
                        }
                    });
                    if (target) popUpChildMenu(target, opt);
                });
                self.menuBar.target.bind("mouseover", function (e) {
                    if (!self.menuBar.opened) return false;
                    var target = U.findParentNode(e.target, function (target) {
                        if (target.getAttribute("data-menu-item-index")) {
                            return true;
                        }
                    });
                    if (target) popUpChildMenu(target, opt);
                });
                return this;
            };
        }();

        /**
         * @method ax5.ui.menu.close
         * @returns {ax5.ui.menu} this
         */
        this.close = function () {
            var that;

            if (self.menuBar && self.menuBar.target) {
                self.menuBar.target.find('[data-menu-item-index]').removeClass("hover");
                self.menuBar.opened = false;
            }

            jQuery(document).unbind("click.ax5menu");
            jQuery(window).unbind("keydown.ax5menu");
            jQuery(window).unbind("resize.ax5menu");

            this.queue.forEach(function (n) {
                n.$target.remove();
            });
            this.queue = [];

            if (cfg.onStateChanged) {
                that = {
                    self: this,
                    state: "close"
                };
                cfg.onStateChanged.call(that, that);
            }

            return this;
        };

        /**
         * @method ax5.ui.menu.getCheckValue
         * @returns {Object} statusCheckItem
         */
        this.getCheckValue = function () {
            var checkItems = {},
                collectItem = function collectItem(items) {
                var i = items.length;
                while (i--) {
                    if (items[i].check && items[i].check.checked) {
                        if (!checkItems[items[i].check.name]) checkItems[items[i].check.name] = items[i].check.value;else {
                            if (U.isString(checkItems[items[i].check.name])) checkItems[items[i].check.name] = [checkItems[items[i].check.name]];
                            checkItems[items[i].check.name].push(items[i].check.value);
                        }
                    }
                    if (items[i].items && items[i].items.length > 0) collectItem(items[i].items);
                }
            };

            collectItem(cfg.items);

            return checkItems;
        };

        // 클래스 생성자
        this.main = function () {
            if (arguments && U.isObject(arguments[0])) {
                this.setConfig(arguments[0]);
            }
        }.apply(this, arguments);
    };
    //== UI Class

    root.menu = function () {
        if (U.isFunction(_SUPER_)) axClass.prototype = new _SUPER_(); // 상속
        return axClass;
    }(); // ax5.ui에 연결
})(ax5.ui, ax5.ui.root);