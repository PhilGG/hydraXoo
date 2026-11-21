// node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: ee, getOwnPropertySymbols: te, getPrototypeOf: ne } = Object, f = globalThis, p = f.trustedTypes, re = p ? p.emptyScript : "", ie = f.reactiveElementPolyfillSupport, m = (e, t) => e, h = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? re : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, g = (e, t) => !l(e, t), _ = {
	attribute: !0,
	type: String,
	converter: h,
	reflect: !1,
	useDefault: !1,
	hasChanged: g
};
Symbol.metadata ??= Symbol("metadata"), f.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var v = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = _) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? _;
	}
	static _$Ei() {
		if (this.hasOwnProperty(m("elementProperties"))) return;
		let e = ne(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(m("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(m("properties"))) {
			let e = this.properties, t = [...ee(e), ...te(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? h : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? h : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? g)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
v.elementStyles = [], v.shadowRootOptions = { mode: "open" }, v[m("elementProperties")] = /* @__PURE__ */ new Map(), v[m("finalized")] = /* @__PURE__ */ new Map(), ie?.({ ReactiveElement: v }), (f.reactiveElementVersions ??= []).push("2.1.2");
// node_modules/lit-html/lit-html.js
var y = globalThis, ae = (e) => e, b = y.trustedTypes, x = b ? b.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, S = "$lit$", C = `lit$${Math.random().toFixed(9).slice(2)}$`, w = "?" + C, oe = `<${w}>`, T = document, E = () => T.createComment(""), D = (e) => e === null || typeof e != "object" && typeof e != "function", O = Array.isArray, se = (e) => O(e) || typeof e?.[Symbol.iterator] == "function", k = "[ 	\n\f\r]", A = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, j = /-->/g, ce = />/g, M = RegExp(`>|${k}(?:([^\\s"'>=/]+)(${k}*=${k}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), le = /'/g, N = /"/g, P = /^(?:script|style|textarea|title)$/i, F = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), I = Symbol.for("lit-noChange"), L = Symbol.for("lit-nothing"), R = /* @__PURE__ */ new WeakMap(), z = T.createTreeWalker(T, 129);
function B(e, t) {
	if (!O(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return x === void 0 ? t : x.createHTML(t);
}
var ue = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = A;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === A ? c[1] === "!--" ? o = j : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = M) : (P.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = M) : o = ce : o === M ? c[0] === ">" ? (o = i ?? A, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? M : c[3] === "\"" ? N : le) : o === N || o === le ? o = M : o === j || o === ce ? o = A : (o = M, i = void 0);
		let d = o === M && e[t + 1].startsWith("/>") ? " " : "";
		a += o === A ? n + oe : l >= 0 ? (r.push(s), n.slice(0, l) + S + n.slice(l) + C + d) : n + C + (l === -2 ? t : d);
	}
	return [B(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, V = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ue(t, n);
		if (this.el = e.createElement(l, r), z.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = z.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(S)) {
					let t = u[o++], n = i.getAttribute(e).split(C), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? fe : r[1] === "?" ? pe : r[1] === "@" ? me : W
					}), i.removeAttribute(e);
				} else e.startsWith(C) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (P.test(i.tagName)) {
					let e = i.textContent.split(C), t = e.length - 1;
					if (t > 0) {
						i.textContent = b ? b.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], E()), z.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], E());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === w) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(C, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += C.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = T.createElement("template");
		return n.innerHTML = e, n;
	}
};
function H(e, t, n = e, r) {
	if (t === I) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = D(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = H(e, i._$AS(e, t.values), i, r)), t;
}
var de = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? T).importNode(t, !0);
		z.currentNode = r;
		let i = z.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new U(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new he(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = z.nextNode(), a++);
		}
		return z.currentNode = T, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, U = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = L, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = H(this, e, t), D(e) ? e === L || e == null || e === "" ? (this._$AH !== L && this._$AR(), this._$AH = L) : e !== this._$AH && e !== I && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? se(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== L && D(this._$AH) ? this._$AA.nextSibling.data = e : this.T(T.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = V.createElement(B(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new de(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = R.get(e.strings);
		return t === void 0 && R.set(e.strings, t = new V(e)), t;
	}
	k(t) {
		O(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(E()), this.O(E()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ae(e).nextSibling;
			ae(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, W = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = L, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = L;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = H(this, e, t, 0), a = !D(e) || e !== this._$AH && e !== I, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = H(this, r[n + o], t, o), s === I && (s = this._$AH[o]), a ||= !D(s) || s !== this._$AH[o], s === L ? e = L : e !== L && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === L ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, fe = class extends W {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === L ? void 0 : e;
	}
}, pe = class extends W {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== L);
	}
}, me = class extends W {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = H(this, e, t, 0) ?? L) === I) return;
		let n = this._$AH, r = e === L && n !== L || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== L && (n === L || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, he = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		H(this, e);
	}
}, ge = y.litHtmlPolyfillSupport;
ge?.(V, U), (y.litHtmlVersions ??= []).push("3.3.3");
var _e = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new U(t.insertBefore(E(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, G = globalThis, K = class extends v {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = _e(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return I;
	}
};
K._$litElement$ = !0, K.finalized = !0, G.litElementHydrateSupport?.({ LitElement: K });
var ve = G.litElementPolyfillSupport;
ve?.({ LitElement: K }), (G.litElementVersions ??= []).push("4.2.2");
var q = {
	title: "Watering",
	loading: "Loading…",
	not_loaded: "hydraXoo is not loaded. Add the integration in Settings › Devices & services.",
	settings: "General settings",
	weather: {
		rain: "Rain: {past} mm fallen, {forecast} mm expected",
		rain_forecast: "Rain: {forecast} mm expected",
		adjusted: "Durations adjusted automatically",
		skipped: "Enough rain expected: cycles skipped for zones that receive rain",
		of_durations: "of durations",
		unavailable: "Weather unavailable",
		unavailable_detail: "Zones water their full duration",
		no_data: "The weather provider gives no rain amounts",
		heat: "Heat bonus +{bonus} % ({temp} °C)"
	},
	pause: {
		paused: "Watering paused",
		until: "Until {date}",
		indefinite: "Until resumed",
		resume: "Resume",
		pause: "Pause watering"
	},
	safety: {
		confirmed: "{zone} · closing checked at {time}",
		confirmed_detail: "The valve closed normally",
		retried: "{zone} · closing checked at {time}",
		retried_detail_one: "Remaining consumption detected: closed after {n} retry of {s} s",
		retried_detail_other: "Remaining consumption detected: closed after {n} retries of {s} s",
		failed: "{zone}: valve not closed",
		failed_detail: "Still {power} W after {n} retries. This zone no longer waters.",
		acknowledge: "Acknowledge",
		unavailable: "{zone} · closing not checked",
		unavailable_detail: "Power sensor unavailable at {time}"
	},
	timeline: {
		title: "Today",
		total: "{min} min of watering",
		running: "In progress",
		done: "Done",
		skipped: "Skipped",
		upcoming: "Upcoming",
		disabled: "Disabled",
		now: "Now",
		label: "{zone}: {count} cycles today"
	},
	zone: {
		rain: "Receives rain · adjusted duration",
		no_rain: "Sheltered from rain",
		heat: " · heat bonus",
		enable: "Enable zone {zone}",
		next: "Next: {time} · {min} min",
		next_day: "Next: {day} {time} · {min} min",
		next_skipped: "Next: {time} · skipped (rain)",
		next_day_skipped: "Next: {day} {time} · skipped (rain)",
		nothing: "No cycle scheduled",
		weather: "Weather: {pct} % of the duration",
		weather_skip: "Rain: watering skipped",
		running: "Watering · {left} left",
		queued: "Waiting its turn",
		checking: "Checking the closing…",
		fault: "Closing fault",
		disabled: "Zone disabled",
		no_cycle_today: "No cycle today",
		water_now: "Water now",
		stop: "Stop",
		edit: "Edit",
		start: "Start",
		cancel: "Cancel",
		duration: "Duration",
		status: {
			done: "Done",
			running: "Now",
			disabled: "Disabled",
			missed: "Not run",
			in_min: "in {m} min",
			in_h: "in {h} h",
			tonight: "tonight"
		},
		skip: {
			weather: "Skipped · rain",
			paused: "Skipped · paused",
			zone_disabled: "Skipped · zone off",
			fault: "Skipped · fault",
			stopped: "Skipped · stopped"
		}
	},
	new_zone: "New zone",
	editor: {
		subtitle: "Zone settings",
		back: "Back to the dashboard",
		cancel: "Cancel and go back",
		general: "Zone",
		name: "Name",
		name_placeholder: "E.g. Rose bed",
		icon: "Icon",
		icons: {
			plant: "Plant",
			tree: "Tree",
			lawn: "Lawn",
			flower: "Flowers",
			drop: "Drop"
		},
		hardware: "Hardware",
		valve: "Solenoid valve",
		switch: "Valve switch · required",
		switch_choose: "Choose a switch entity…",
		power: "Power sensor · recommended",
		power_choose: "Choose a power sensor (W)…",
		power_hint: "The sensor checks that the valve really closed.",
		online: "Online",
		offline: "Unavailable",
		check: "Check the closing",
		threshold: "Valve considered open above",
		threshold_hint: "Reading after closing",
		delay: "Check delay",
		delay_hint: "After the closing order",
		pulse: "Retry",
		pulse_hint: "Open then close again",
		attempts: "Maximum retries",
		attempts_hint: "Then alert and notification",
		cutoff: "Safety cut-off",
		cutoff_hint: "Forced stop if the valve stays open",
		cycles: "Cycles",
		today_total: "{min} min today",
		no_cycle: "No cycle yet: this zone only waters on demand.",
		cycle: "Cycle {n}",
		every_day: "Every day",
		weekdays_only: "Weekdays",
		weekend: "Weekend",
		n_days: "{n} days / week",
		no_day: "No day selected",
		enable_cycle: "Enable cycle {n}",
		delete_cycle: "Delete cycle {n}",
		start_time: "Start time of cycle {n}",
		day_label: "{day}, cycle {n}",
		decrease: "Decrease {what}",
		increase: "Increase {what}",
		duration_of: "the duration of cycle {n}",
		add_cycle: "Add a cycle",
		rain: "Receives rain",
		rain_source: "Source: {name}",
		rain_none: "No weather entity yet: choose one in the integration's general settings.",
		today: "Today",
		rain_detail: "{past} mm fallen · {forecast} mm expected",
		skip: "Skip the cycle if rain expected reaches",
		skip_hint: "Rain expected in the next 24 hours",
		past: "Rain fallen taken into account",
		past_hint: "Over the last hours",
		heat: "Water more on hot days",
		heat_hint: "Duration increased by this percentage · 0 % = never",
		heat_threshold: "Hot day from",
		heat_threshold_hint: "Highest temperature expected during the day",
		heat_summary: "If the day is expected to reach {t} °C or more, the duration is increased by {pct} %.",
		save: "Save",
		saving: "Saving…",
		create: "Create and add cycles",
		create_hint: "Cycles are set at the next step.",
		delete: "Delete this zone",
		delete_confirm: "Delete zone {zone}? Its cycles and entities will be removed.",
		errors: {
			name: "Enter a name.",
			switch: "Choose the valve switch.",
			no_day: "Each cycle needs at least one day.",
			duration_exceeds_max: "A cycle lasts longer than the safety cut-off.",
			generic: "Could not save: {message}"
		},
		rain_choice: "Rain",
		receives_rain: "Receives rain",
		receives_rain_desc: "Durations adjusted to the rain",
		no_rain: "Sheltered from rain",
		no_rain_desc: "Greenhouse, covered area: rain is ignored",
		weather_title: "Weather",
		rain_hint: "Duration adjusted to the rain fallen and expected",
		no_rain_detail: "Rain ignored: only heat can change the duration"
	},
	days: {
		short: [
			"M",
			"T",
			"W",
			"T",
			"F",
			"S",
			"S"
		],
		long: [
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday"
		]
	},
	card_editor: {
		title: "Title",
		compact: "Compact display",
		zones: "Zones shown (all when empty)"
	}
}, J = {
	en: q,
	fr: {
		title: "Arrosage",
		loading: "Chargement…",
		not_loaded: "hydraXoo n'est pas chargé. Ajoutez l'intégration dans Paramètres › Appareils et services.",
		settings: "Réglages généraux",
		weather: {
			rain: "Pluie : {past} mm tombés, {forecast} mm prévus",
			rain_forecast: "Pluie : {forecast} mm prévus",
			adjusted: "Durées ajustées automatiquement",
			skipped: "Assez de pluie prévue : cycles sautés pour les zones qui reçoivent la pluie",
			of_durations: "des durées",
			unavailable: "Météo indisponible",
			unavailable_detail: "Les zones arrosent leur durée complète",
			no_data: "Le fournisseur météo ne donne pas de quantité de pluie",
			heat: "Bonus chaleur +{bonus} % ({temp} °C)"
		},
		pause: {
			paused: "Arrosage en pause",
			until: "Jusqu'au {date}",
			indefinite: "Jusqu'à la reprise",
			resume: "Reprendre",
			pause: "Mettre en pause"
		},
		safety: {
			confirmed: "{zone} · fermeture vérifiée à {time}",
			confirmed_detail: "La vanne s'est refermée normalement",
			retried: "{zone} · fermeture vérifiée à {time}",
			retried_detail_one: "Consommation résiduelle détectée : refermée après {n} relance de {s} s",
			retried_detail_other: "Consommation résiduelle détectée : refermée après {n} relances de {s} s",
			failed: "{zone} : vanne non refermée",
			failed_detail: "Encore {power} W après {n} relances. Cette zone n'arrose plus.",
			acknowledge: "Acquitter",
			unavailable: "{zone} · fermeture non vérifiée",
			unavailable_detail: "Capteur de consommation indisponible à {time}"
		},
		timeline: {
			title: "Aujourd'hui",
			total: "{min} min d'arrosage",
			running: "En cours",
			done: "Terminé",
			skipped: "Sauté",
			upcoming: "À venir",
			disabled: "Désactivé",
			now: "Maintenant",
			label: "{zone} : {count} cycles aujourd'hui"
		},
		zone: {
			rain: "Reçoit la pluie · durée ajustée",
			no_rain: "À l'abri de la pluie",
			heat: " · bonus chaleur",
			enable: "Activer la zone {zone}",
			next: "Prochain : {time} · {min} min",
			next_day: "Prochain : {day} {time} · {min} min",
			next_skipped: "Prochain : {time} · sauté (pluie)",
			next_day_skipped: "Prochain : {day} {time} · sauté (pluie)",
			nothing: "Aucun cycle programmé",
			weather: "Météo : {pct} % de la durée",
			weather_skip: "Pluie : arrosage sauté",
			running: "Arrosage · reste {left}",
			queued: "En attente de son tour",
			checking: "Contrôle de fermeture…",
			fault: "Défaut de fermeture",
			disabled: "Zone désactivée",
			no_cycle_today: "Aucun cycle aujourd'hui",
			water_now: "Arroser maintenant",
			stop: "Arrêter",
			edit: "Modifier",
			start: "Démarrer",
			cancel: "Annuler",
			duration: "Durée",
			status: {
				done: "Fait",
				running: "En cours",
				disabled: "Désactivé",
				missed: "Non lancé",
				in_min: "dans {m} min",
				in_h: "dans {h} h",
				tonight: "ce soir"
			},
			skip: {
				weather: "Sauté · pluie",
				paused: "Sauté · pause",
				zone_disabled: "Sauté · zone inactive",
				fault: "Sauté · défaut",
				stopped: "Sauté · arrêté"
			}
		},
		new_zone: "Nouvelle zone",
		editor: {
			subtitle: "Réglages de la zone",
			back: "Retour au tableau de bord",
			cancel: "Annuler et revenir au tableau de bord",
			general: "Zone",
			name: "Nom",
			name_placeholder: "Ex. : Massif rosiers",
			icon: "Icône",
			icons: {
				plant: "Plante",
				tree: "Arbre",
				lawn: "Pelouse",
				flower: "Fleurs",
				drop: "Goutte"
			},
			hardware: "Matériel",
			valve: "Électrovanne",
			switch: "Interrupteur de la vanne · obligatoire",
			switch_choose: "Choisir une entité switch…",
			power: "Capteur de consommation · recommandé",
			power_choose: "Choisir un capteur de puissance (W)…",
			power_hint: "Le capteur permet de vérifier que la vanne s'est bien refermée.",
			online: "En ligne",
			offline: "Indisponible",
			check: "Vérifier la fermeture",
			threshold: "Vanne considérée ouverte au-delà de",
			threshold_hint: "Mesure après fermeture",
			delay: "Délai de contrôle",
			delay_hint: "Après l'ordre de fermeture",
			pulse: "Relance",
			pulse_hint: "Ouvrir puis refermer",
			attempts: "Essais maximum",
			attempts_hint: "Puis alerte et notification",
			cutoff: "Coupure de sécurité",
			cutoff_hint: "Arrêt forcé si la vanne reste ouverte",
			cycles: "Cycles",
			today_total: "{min} min aujourd'hui",
			no_cycle: "Aucun cycle pour l'instant : cette zone n'arrose qu'à la demande.",
			cycle: "Cycle {n}",
			every_day: "Tous les jours",
			weekdays_only: "En semaine",
			weekend: "Le week-end",
			n_days: "{n} jours / semaine",
			no_day: "Aucun jour choisi",
			enable_cycle: "Activer le cycle {n}",
			delete_cycle: "Supprimer le cycle {n}",
			start_time: "Heure de début du cycle {n}",
			day_label: "{day}, cycle {n}",
			decrease: "Diminuer {what}",
			increase: "Augmenter {what}",
			duration_of: "la durée du cycle {n}",
			add_cycle: "Ajouter un cycle",
			rain: "Reçoit la pluie",
			rain_source: "Source : {name}",
			rain_none: "Pas encore d'entité météo : choisissez-en une dans les réglages généraux de l'intégration.",
			today: "Aujourd'hui",
			rain_detail: "{past} mm tombés · {forecast} mm prévus",
			skip: "Sauter le cycle si la pluie prévue atteint",
			skip_hint: "Pluie attendue dans les 24 prochaines heures",
			past: "Pluie tombée prise en compte",
			past_hint: "Sur les dernières heures",
			heat: "Arroser plus les jours chauds",
			heat_hint: "Durée allongée de ce pourcentage · 0 % = jamais",
			heat_threshold: "Jour chaud à partir de",
			heat_threshold_hint: "Température maximale prévue dans la journée",
			heat_summary: "Si la journée doit atteindre {t} °C ou plus, la durée est allongée de {pct} %.",
			save: "Enregistrer",
			saving: "Enregistrement…",
			create: "Créer et ajouter des cycles",
			create_hint: "Les cycles se règlent à l'étape suivante.",
			delete: "Supprimer cette zone",
			delete_confirm: "Supprimer la zone {zone} ? Ses cycles et ses entités seront supprimés.",
			errors: {
				name: "Saisissez un nom.",
				switch: "Choisissez l'interrupteur de la vanne.",
				no_day: "Chaque cycle doit avoir au moins un jour.",
				duration_exceeds_max: "Un cycle dure plus longtemps que la coupure de sécurité.",
				generic: "Enregistrement impossible : {message}"
			},
			rain_choice: "Pluie",
			receives_rain: "Reçoit la pluie",
			receives_rain_desc: "Durées ajustées selon la pluie",
			no_rain: "À l'abri de la pluie",
			no_rain_desc: "Serre, terrasse couverte : la pluie est ignorée",
			weather_title: "Météo",
			rain_hint: "Durée ajustée selon la pluie tombée et prévue",
			no_rain_detail: "Pluie ignorée : seule la chaleur peut changer la durée"
		},
		days: {
			short: [
				"L",
				"M",
				"M",
				"J",
				"V",
				"S",
				"D"
			],
			long: [
				"Lundi",
				"Mardi",
				"Mercredi",
				"Jeudi",
				"Vendredi",
				"Samedi",
				"Dimanche"
			]
		},
		card_editor: {
			title: "Titre",
			compact: "Affichage compact",
			zones: "Zones affichées (toutes si vide)"
		}
	}
};
function Y(e, t) {
	let n = e;
	for (let e of t.split(".")) {
		if (typeof n != "object" || !n || Array.isArray(n)) return;
		n = n[e];
	}
	return typeof n == "string" ? n : void 0;
}
function X(e) {
	return (e?.locale?.language || e?.language || "en").split("-")[0];
}
function Z(e) {
	let t = J[X(e)] ?? q;
	return (e, n) => {
		let r = Y(t, e) ?? Y(q, e) ?? e;
		for (let [e, t] of Object.entries(n ?? {})) r = r.replaceAll(`{${e}}`, String(t));
		return r;
	};
}
function ye(e) {
	return (J[X(e)] ?? q).days ?? q.days;
}
function be(e, t, n, r = {}) {
	return e(`${t}_${n === 1 ? "one" : "other"}`, {
		n,
		...r
	});
}
// src/editor.ts
var xe = class extends K {
	constructor(...e) {
		super(...e), this._config = { type: "custom:hydraxoo-card" }, this._zones = [], this._loading = !1;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 },
			_zones: { state: !0 }
		};
	}
	setConfig(e) {
		this._config = { ...e };
	}
	updated() {
		this.hass && !this._zones.length && !this._loading && this._loadZones();
	}
	async _loadZones() {
		this._loading = !0;
		try {
			let e;
			await new Promise((t, n) => {
				this.hass.connection.subscribeMessage((e) => {
					"zones" in e && (this._zones = e.zones.map((e) => ({
						id: e.id,
						name: e.name
					})), t());
				}, { type: "hydraxoo/subscribe" }).then((t) => e = t, n);
			}), e?.();
		} catch {}
	}
	_schema() {
		return [
			{
				name: "title",
				selector: { text: {} }
			},
			{
				name: "compact",
				selector: { boolean: {} }
			},
			{
				name: "zones",
				selector: { select: {
					multiple: !0,
					mode: "list",
					options: this._zones.map((e) => ({
						value: e.id,
						label: e.name
					}))
				} }
			}
		];
	}
	_changed(e) {
		let t = {
			...this._config,
			...e.detail.value
		};
		for (let e of ["title", "zones"]) {
			let n = t[e];
			(n === "" || Array.isArray(n) && n.length === 0) && delete t[e];
		}
		t.compact || delete t.compact, this._config = t, this.dispatchEvent(new CustomEvent("config-changed", {
			detail: { config: t },
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		if (!this.hass) return L;
		let e = Z(this.hass);
		return F`<ha-form
      .hass=${this.hass}
      .data=${{
			compact: !1,
			zones: [],
			...this._config
		}}
      .schema=${this._schema()}
      .computeLabel=${(t) => e(`card_editor.${t.name}`)}
      @value-changed=${this._changed}
    ></ha-form>`;
	}
};
customElements.get("hydraxoo-card-editor") || customElements.define("hydraxoo-card-editor", xe);
// src/schedule.ts
var Se = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun"
];
function Q(e, t) {
	let n = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
		timeZone: t,
		weekday: "short",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).formatToParts(e).map((e) => [e.type, e.value]));
	return {
		weekday: Se.indexOf(n.weekday),
		minutes: Number(n.hour) * 60 + Number(n.minute),
		dateKey: `${n.year}-${n.month}-${n.day}`
	};
}
function Ce(e) {
	let [t, n] = e.split(":").map(Number);
	return t * 60 + n;
}
function $(e, t, n) {
	let r = typeof e == "string" ? new Date(e) : e;
	return new Intl.DateTimeFormat(n, {
		timeZone: t,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).format(r);
}
function we(e, t, n) {
	let r = typeof e == "string" ? new Date(e) : e, i = new Intl.DateTimeFormat(n, {
		timeZone: t,
		weekday: "long",
		day: "numeric",
		month: "long"
	}).format(r);
	return i.charAt(0).toUpperCase() + i.slice(1);
}
function Te(e) {
	let t = Math.max(0, Math.round(e)), n = Math.floor(t / 3600), r = Math.floor(t % 3600 / 60), i = String(t % 60).padStart(2, "0");
	return n ? `${n}:${String(r).padStart(2, "0")}:${i}` : `${r}:${i}`;
}
function Ee(e, t) {
	return e.weather.skip ? 0 : Math.round(t * e.weather.coefficient_pct / 100);
}
function De(e, t, n, r, i) {
	return [...e].reverse().find((e) => e.zone_id === t.id && e.cycle_id === n && Q(new Date(e.started), i).dateKey === r);
}
function Oe(e, t, n, r) {
	return e.cycles.filter((e) => e.weekdays.includes(t.weekday)).map((i) => {
		let a = Ce(i.start_time), o = i.duration_min, s = Ee(e, o), c;
		if (e.running && e.run && e.run.cycle_id === i.id) c = { kind: "running" }, s = e.run.duration_min;
		else if (!i.enabled || !e.enabled) c = { kind: "disabled" };
		else if (a <= t.minutes) {
			let a = De(n, e, i.id, t.dateKey, r);
			a?.kind === "run" ? (c = {
				kind: "done",
				duration: a.duration_min
			}, s = a.duration_min ?? s) : a?.kind === "skipped" ? (c = {
				kind: "skipped",
				reason: a.reason
			}, s = 0) : c = { kind: "past" };
		} else c = s === 0 ? {
			kind: "skipped",
			reason: "weather"
		} : {
			kind: "upcoming",
			inMinutes: a - t.minutes,
			startMinutes: a
		};
		return {
			cycle: i,
			start: a,
			base: o,
			adjusted: s,
			status: c
		};
	}).sort((e, t) => e.start - t.start);
}
function ke(e) {
	return e.filter((e) => e.status.kind !== "disabled").reduce((e, t) => e + t.adjusted, 0);
}
function Ae(e) {
	let t = [...new Set(e)].sort();
	return t.length === 7 ? { key: "every_day" } : t.join() === "0,1,2,3,4" ? { key: "weekdays_only" } : t.join() === "5,6" ? { key: "weekend" } : t.length === 0 ? { key: "no_day" } : {
		key: "n_days",
		n: t.length
	};
}
// src/styles.ts
var je = o`
  :host {
    --hx-primary: var(--primary-color, #1d4ed8);
    --hx-on-primary: var(--text-primary-color, #ffffff);
    --hx-text: var(--primary-text-color, #111827);
    --hx-muted: var(--secondary-text-color, #4b5563);
    --hx-divider: var(--divider-color, #e5e7eb);
    --hx-warning: var(--warning-color, #b45309);
    --hx-success: var(--success-color, #166534);
    --hx-error: var(--error-color, #b91c1c);
    --hx-tile: color-mix(in srgb, var(--hx-text) 4%, transparent);
    --hx-track: color-mix(in srgb, var(--hx-text) 8%, transparent);
    --hx-soft: color-mix(in srgb, var(--hx-primary) 12%, transparent);
    --hx-warning-soft: color-mix(in srgb, var(--hx-warning) 14%, transparent);
    --hx-success-soft: color-mix(in srgb, var(--hx-success) 14%, transparent);
    --hx-error-soft: color-mix(in srgb, var(--hx-error) 14%, transparent);
    --hx-radius: var(--ha-card-border-radius, 16px);
    display: block;
    color: var(--hx-text);
  }
  ha-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.2;
  }
  .header .sub {
    font-size: 14px;
    color: var(--hx-muted);
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .tile {
    background: var(--hx-tile);
    border-radius: var(--hx-radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .grow {
    flex: 1 1 auto;
    min-width: 0;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .strong {
    font-size: 15px;
    font-weight: 600;
  }
  .small {
    font-size: 13px;
    color: var(--hx-muted);
  }
  .tiny {
    font-size: 12px;
    color: var(--hx-muted);
  }
  .badge-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--hx-soft);
    color: var(--hx-primary);
    --mdc-icon-size: 22px;
  }
  .badge-icon.warning {
    background: var(--hx-warning-soft);
    color: var(--hx-warning);
  }
  .badge-icon.success {
    background: var(--hx-success-soft);
    color: var(--hx-success);
  }
  .badge-icon.error {
    background: var(--hx-error-soft);
    color: var(--hx-error);
  }
  .big-number {
    white-space: nowrap;
    font-size: 24px;
    font-weight: 700;
    color: var(--hx-warning);
    text-align: right;
    line-height: 1.1;
  }
  .error-text {
    color: var(--hx-error);
    font-size: 13px;
  }
  button {
    font: inherit;
    color: inherit;
  }
  .icon-button {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    border: 1px solid var(--hx-divider);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    color: var(--hx-text);
    --mdc-icon-size: 20px;
  }
  .btn {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid var(--hx-divider);
    background: transparent;
    font-size: 15px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    --mdc-icon-size: 18px;
  }
  .btn.primary {
    background: var(--hx-primary);
    color: var(--hx-on-primary);
    border-color: transparent;
  }
  .btn.danger {
    color: var(--hx-error);
    border-color: var(--hx-error);
  }
  .btn.ghost-dashed {
    border: 1.5px dashed var(--hx-primary);
    color: var(--hx-primary);
    background: var(--hx-soft);
    min-height: 52px;
  }
  .btn[disabled] {
    opacity: 0.5;
    cursor: default;
  }
  .btn.grow {
    flex: 1 1 auto;
  }
  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  /* Accessible switch: a real button with role=switch */
  .switch {
    width: 52px;
    height: 32px;
    border-radius: 16px;
    border: none;
    background: var(--hx-track);
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    /* 44 px touch target */
    outline-offset: 2px;
    margin: 6px 0;
  }
  .switch::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 26px;
    height: 26px;
    border-radius: 13px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transition: left 0.15s;
  }
  .switch[aria-checked="true"] {
    background: var(--hx-primary);
  }
  .switch[aria-checked="true"]::after {
    left: 23px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--hx-soft);
    color: var(--hx-primary);
    --mdc-icon-size: 14px;
  }
  .chip.warning {
    background: var(--hx-warning-soft);
    color: var(--hx-warning);
  }
  .chip.error {
    background: var(--hx-error-soft);
    color: var(--hx-error);
  }
  .chip.success {
    background: var(--hx-success-soft);
    color: var(--hx-success);
  }
  .chip.muted {
    background: var(--hx-track);
    color: var(--hx-muted);
  }
  /* Timeline */
  .timeline {
    display: grid;
    grid-template-columns: 84px minmax(0, 1fr);
    row-gap: 10px;
    align-items: center;
  }
  .timeline .label {
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 8px;
  }
  .track {
    position: relative;
    height: 28px;
    border-radius: 8px;
    background: var(--hx-track);
  }
  .mark {
    position: absolute;
    top: 4px;
    height: 20px;
    min-width: 9px;
    border-radius: 4px;
    background: var(--hx-primary);
    box-sizing: border-box;
  }
  .mark.done,
  .mark.past {
    background: var(--hx-muted);
    opacity: 0.55;
  }
  /* Skipped (rain, pause, fault…): striped, so it never looks like "done" */
  .mark.skipped,
  .swatch.skipped {
    background: repeating-linear-gradient(
      135deg,
      var(--hx-muted) 0 2px,
      transparent 2px 5px
    );
    border: 1.5px solid var(--hx-muted);
    opacity: 0.8;
  }
  .mark.disabled {
    background: transparent;
    border: 1.5px dashed var(--hx-muted);
  }
  .mark.running {
    background: var(--hx-success);
  }
  .now {
    position: absolute;
    top: -4px;
    width: 2px;
    height: 36px;
    border-radius: 1px;
    background: var(--hx-warning);
  }
  .hours {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--hx-muted);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    font-size: 12px;
    color: var(--hx-muted);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--hx-primary);
    box-sizing: border-box;
  }
  .swatch.running {
    background: var(--hx-success);
  }
  .swatch.done {
    background: var(--hx-muted);
    opacity: 0.55;
  }
  .swatch.disabled {
    background: transparent;
    border: 1.5px dashed var(--hx-muted);
  }
  .swatch.nowline {
    width: 2px;
    height: 12px;
    background: var(--hx-warning);
  }
  /* Cycle list on the dashboard */
  .cycles {
    display: flex;
    flex-direction: column;
  }
  .cycle-row {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid var(--hx-divider);
    font-size: 14px;
  }
  .cycle-row .time {
    font-size: 18px;
    font-weight: 600;
  }
  .cycle-row.muted .time,
  .cycle-row.muted .dur {
    color: var(--hx-muted);
  }
  .dur {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dur s {
    color: var(--hx-muted);
  }
  .dur b {
    color: var(--hx-primary);
  }
  .cycle-row.muted .dur b {
    color: var(--hx-muted);
  }
  .status {
    font-size: 13px;
    color: var(--hx-muted);
    text-align: right;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    justify-content: flex-end;
    --mdc-icon-size: 14px;
  }
  .status.upcoming {
    color: var(--hx-primary);
    font-weight: 500;
  }
  .status.running {
    color: var(--hx-success);
    font-weight: 600;
  }
  /* Steppers and settings rows */
  .stepper {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .stepper button {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid var(--hx-divider);
    background: transparent;
    font-size: 20px;
    cursor: pointer;
  }
  .stepper .value {
    min-width: 64px;
    text-align: center;
    font-weight: 600;
    font-size: 15px;
  }
  .setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-top: 1px solid var(--hx-divider);
  }
  .setting:first-child {
    border-top: none;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--hx-muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  label.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
  }
  input[type="text"],
  input[type="time"],
  select {
    min-height: 48px;
    border-radius: 12px;
    border: 1px solid var(--hx-divider);
    padding: 0 14px;
    font: inherit;
    font-size: 16px;
    font-weight: 400;
    color: var(--hx-text);
    background: var(--card-background-color, transparent);
    box-sizing: border-box;
    width: 100%;
  }
  input[type="time"] {
    width: auto;
    font-size: 18px;
    font-weight: 600;
  }
  .icon-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }
  .choice {
    min-height: 52px;
    border-radius: 14px;
    border: 1px solid var(--hx-divider);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--hx-text);
    --mdc-icon-size: 22px;
  }
  .choice[aria-pressed="true"] {
    border: 2px solid var(--hx-primary);
    background: var(--hx-soft);
    color: var(--hx-primary);
  }
  .choice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .choice-grid .choice {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px;
    text-align: left;
  }
  .days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
  }
  .days .choice {
    min-height: 44px;
    font-weight: 600;
  }
  .cycle-card {
    border: 1px solid var(--hx-divider);
    border-radius: 14px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cycle-card.off {
    opacity: 0.6;
  }
  .meter {
    height: 8px;
    border-radius: 4px;
    background: var(--hx-track);
    overflow: hidden;
  }
  .meter > div {
    height: 100%;
    background: var(--hx-warning);
    border-radius: 4px;
  }
  .compact .cycles,
  .compact .zone-sub {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .switch::after {
      transition: none;
    }
  }
`, Me = {
	threshold_w: 1,
	check_delay_s: 10,
	retry_pulse_s: 5,
	max_attempts: 5
}, Ne = {
	skip_mm: 5,
	past_window_h: 48,
	forecast_window_h: 24,
	heat_threshold_c: 30,
	heat_bonus_pct: 0,
	min_pct: 0,
	max_pct: 150
}, Pe = [
	{
		icon: "mdi:sprout",
		key: "plant"
	},
	{
		icon: "mdi:tree",
		key: "tree"
	},
	{
		icon: "mdi:grass",
		key: "lawn"
	},
	{
		icon: "mdi:flower",
		key: "flower"
	},
	{
		icon: "mdi:water",
		key: "drop"
	}
];
// src/zone-form.ts
function Fe(e) {
	return JSON.parse(JSON.stringify(e));
}
function Ie() {
	return {
		name: "",
		icon: Pe[0].icon,
		enabled: !0,
		switch_entity: "",
		power_entity: null,
		max_runtime_min: 30,
		receives_rain: !0,
		safety: { ...Me },
		weather_rules: { ...Ne },
		cycles: []
	};
}
var Le = class extends K {
	constructor(...e) {
		super(...e), this.zone = null, this.state = null, this._draft = Ie(), this._error = "", this._saving = !1, this._loadedFor = void 0, this._addCycle = () => {
			let e = this._draft.cycles.at(-1), t = {
				enabled: !0,
				start_time: e ? e.start_time : "06:00",
				duration_min: Math.min(10, this._draft.max_runtime_min),
				weekdays: [
					0,
					1,
					2,
					3,
					4,
					5,
					6
				]
			};
			this._set({ cycles: [...this._draft.cycles, t] });
		};
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			zone: { attribute: !1 },
			state: { attribute: !1 },
			_draft: { state: !0 },
			_error: { state: !0 },
			_saving: { state: !0 }
		};
	}
	static {
		this.styles = je;
	}
	willUpdate() {
		let e = this.zone?.id ?? null;
		e !== this._loadedFor && (this._loadedFor = e, this._draft = this.zone ? Fe(this._configOf(this.zone)) : Ie(), this._error = "");
	}
	_configOf(e) {
		let { id: t, name: n, icon: r, enabled: i, switch_entity: a, power_entity: o, max_runtime_min: s, receives_rain: c, safety: l, weather_rules: u, cycles: d } = e;
		return {
			id: t,
			name: n,
			icon: r,
			enabled: i,
			switch_entity: a,
			power_entity: o,
			max_runtime_min: s,
			receives_rain: c,
			safety: l,
			weather_rules: u,
			cycles: d
		};
	}
	get _t() {
		return Z(this.hass);
	}
	_set(e) {
		this._draft = {
			...this._draft,
			...e
		};
	}
	_setCycle(e, t) {
		let n = this._draft.cycles.map((n, r) => r === e ? {
			...n,
			...t
		} : n);
		this._set({ cycles: n });
	}
	_stepper(e, t, n) {
		let r = this._t, i = t.step ?? 1, a = t.fine && e <= (t.fineBelow ?? 0) ? t.fine : i, o = t.fine && e < (t.fineBelow ?? 0) ? t.fine : i, s = (e) => Math.round(e * 10) / 10, c = (e) => n(s(Math.min(t.max, Math.max(t.min, e))));
		return F`<span class="stepper">
      <button
        type="button"
        aria-label=${r("editor.decrease", { what: t.what })}
        ?disabled=${e <= t.min}
        @click=${() => c(e - a)}
      >−</button>
      <span class="value" aria-live="polite"
        >${t.signed && e > 0 ? "+" : ""}${e.toLocaleString(X(this.hass))} ${t.unit}</span
      >
      <button
        type="button"
        aria-label=${r("editor.increase", { what: t.what })}
        ?disabled=${e >= t.max}
        @click=${() => c(e + o)}
      >+</button>
    </span>`;
	}
	_switch(e, t, n) {
		return F`<button
      type="button"
      class="switch"
      role="switch"
      aria-checked=${e ? "true" : "false"}
      aria-label=${t}
      @click=${() => n(!e)}
    ></button>`;
	}
	_entityPicker(e, t, n, r, i) {
		if (customElements.get("ha-selector")) return F`<ha-selector
        .hass=${this.hass}
        .selector=${{ entity: { filter: t } }}
        .value=${e ?? ""}
        .label=${n}
        @value-changed=${(e) => i(e.detail.value || null)}
      ></ha-selector>`;
		let a = Object.values(this.hass.states).filter((e) => e.entity_id.startsWith(`${t.domain}.`) && (!t.device_class || e.attributes.device_class === t.device_class)).sort((e, t) => e.entity_id.localeCompare(t.entity_id));
		return F`<label class="field">
      ${n}
      <select @change=${(e) => i(e.target.value || null)}>
        <option value="" ?selected=${!e}>${r}</option>
        ${a.map((t) => F`<option value=${t.entity_id} ?selected=${t.entity_id === e}>
            ${t.attributes.friendly_name ?? t.entity_id} (${t.entity_id})
          </option>`)}
      </select>
    </label>`;
	}
	_general(e) {
		let t = this._t, n = this._draft;
		return F`<section class="tile" aria-labelledby="hx-general">
      <h3 id="hx-general">${t("editor.general")}</h3>
      <label class="field">
        ${t("editor.name")}
        <input
          type="text"
          .value=${n.name}
          placeholder=${t("editor.name_placeholder")}
          @input=${(e) => this._set({ name: e.target.value })}
        />
      </label>
      <div class="stack" role="group" aria-label=${t("editor.icon")}>
        <span class="small strong">${t("editor.icon")}</span>
        <div class="icon-grid">
          ${Pe.map((e) => F`<button
              type="button"
              class="choice"
              aria-pressed=${n.icon === e.icon ? "true" : "false"}
              aria-label=${t(`editor.icons.${e.key}`)}
              @click=${() => this._set({ icon: e.icon })}
            ><ha-icon .icon=${e.icon}></ha-icon></button>`)}
        </div>
      </div>
      ${e ? F`<div class="stack" role="group" aria-label=${t("editor.rain_choice")}>
            <span class="small strong">${t("editor.rain_choice")}</span>
            <div class="choice-grid">
              ${[!0, !1].map((e) => F`<button
                  type="button"
                  class="choice"
                  aria-pressed=${n.receives_rain === e ? "true" : "false"}
                  @click=${() => this._set({ receives_rain: e })}
                >
                  <span class="strong">${t(e ? "editor.receives_rain" : "editor.no_rain")}</span>
                  <span class="tiny">${t(e ? "editor.receives_rain_desc" : "editor.no_rain_desc")}</span>
                </button>`)}
            </div>
          </div>` : L}
    </section>`;
	}
	_hardware(e) {
		let t = this._t, n = this._draft, r = n.switch_entity ? this.hass.states[n.switch_entity] : void 0, i = r && r.state !== "unavailable", a = n.power_entity !== null, o = n.safety;
		return F`<section class="tile" aria-labelledby="hx-hw">
      <h3 id="hx-hw">${t(e ? "editor.valve" : "editor.hardware")}</h3>
      ${this._entityPicker(n.switch_entity || null, { domain: "switch" }, t("editor.switch"), t("editor.switch_choose"), (e) => this._set({ switch_entity: e ?? "" }))}
      ${n.switch_entity ? F`<span class="chip ${i ? "success" : "error"}"
            >${t(i ? "editor.online" : "editor.offline")}</span
          >` : L}
      ${e ? F`<div class="row">
            <span class="grow strong">${t("editor.check")}</span>
            ${this._switch(a, t("editor.check"), (e) => this._set({ power_entity: e ? n.power_entity ?? "" : null }))}
          </div>` : L}
      ${!e || a ? this._entityPicker(n.power_entity || null, {
			domain: "sensor",
			device_class: "power"
		}, t("editor.power"), t("editor.power_choose"), (t) => this._set({ power_entity: t ?? (e ? "" : null) })) : L}
      <span class="tiny">${t("editor.power_hint")}</span>
      ${e && a ? F`<div>
            ${this._setting(t("editor.threshold"), t("editor.threshold_hint"), this._stepper(o.threshold_w, {
			min: .1,
			max: 100,
			step: .5,
			fine: .1,
			fineBelow: 1,
			unit: "W",
			what: t("editor.threshold")
		}, (e) => this._set({ safety: {
			...o,
			threshold_w: e
		} })))}
            ${this._setting(t("editor.delay"), t("editor.delay_hint"), this._stepper(o.check_delay_s, {
			min: 1,
			max: 300,
			unit: "s",
			what: t("editor.delay")
		}, (e) => this._set({ safety: {
			...o,
			check_delay_s: e
		} })))}
            ${this._setting(t("editor.pulse"), t("editor.pulse_hint"), this._stepper(o.retry_pulse_s, {
			min: 1,
			max: 60,
			unit: "s",
			what: t("editor.pulse")
		}, (e) => this._set({ safety: {
			...o,
			retry_pulse_s: e
		} })))}
            ${this._setting(t("editor.attempts"), t("editor.attempts_hint"), this._stepper(o.max_attempts, {
			min: 1,
			max: 10,
			unit: "",
			what: t("editor.attempts")
		}, (e) => this._set({ safety: {
			...o,
			max_attempts: e
		} })))}
          </div>` : L}
      ${e ? this._setting(t("editor.cutoff"), t("editor.cutoff_hint"), this._stepper(n.max_runtime_min, {
			min: 1,
			max: 240,
			unit: "min",
			what: t("editor.cutoff")
		}, (e) => this._set({ max_runtime_min: e }))) : L}
    </section>`;
	}
	_setting(e, t, n) {
		return F`<div class="setting">
      <span class="stack"><span class="strong">${e}</span><span class="tiny">${t}</span></span>
      ${n}
    </div>`;
	}
	_cycles() {
		let e = this._t, t = ye(this.hass), n = this._draft.cycles;
		return F`<section class="tile" aria-labelledby="hx-cycles">
      <div class="row">
        <h2 id="hx-cycles" class="grow">${e("editor.cycles")}</h2>
      </div>
      ${n.length === 0 ? F`<span class="small">${e("editor.no_cycle")}</span>` : L}
      ${n.map((r, i) => {
			let a = i + 1, o = Ae(r.weekdays);
			return F`<div class="cycle-card ${r.enabled ? "" : "off"}">
          <div class="row">
            ${this._switch(r.enabled, e("editor.enable_cycle", { n: a }), (e) => this._setCycle(i, { enabled: e }))}
            <span class="stack grow">
              <span class="strong">${e("editor.cycle", { n: a })}</span>
              <span class="tiny">${e(`editor.${o.key}`, { n: o.n ?? 0 })}</span>
            </span>
            <button
              type="button"
              class="icon-button"
              aria-label=${e("editor.delete_cycle", { n: a })}
              @click=${() => this._set({ cycles: n.filter((e, t) => t !== i) })}
            ><ha-icon icon="mdi:delete-outline"></ha-icon></button>
          </div>
          <div class="row">
            <input
              type="time"
              aria-label=${e("editor.start_time", { n: a })}
              .value=${r.start_time}
              @change=${(e) => this._setCycle(i, { start_time: e.target.value || r.start_time })}
            />
            <span class="grow"></span>
            ${this._stepper(r.duration_min, {
				min: 1,
				max: this._draft.max_runtime_min,
				unit: "min",
				what: e("editor.duration_of", { n: a })
			}, (e) => this._setCycle(i, { duration_min: e }))}
          </div>
          <div class="days">
            ${t.short.map((n, o) => F`<button
                type="button"
                class="choice"
                aria-pressed=${r.weekdays.includes(o) ? "true" : "false"}
                aria-label=${e("editor.day_label", {
				day: t.long[o],
				n: a
			})}
                @click=${() => this._toggleDay(i, o)}
              >${n}</button>`)}
          </div>
        </div>`;
		})}
      <button type="button" class="btn ghost-dashed" @click=${this._addCycle}>
        <ha-icon icon="mdi:plus"></ha-icon>${e("editor.add_cycle")}
      </button>
    </section>`;
	}
	_toggleDay(e, t) {
		let n = this._draft.cycles[e].weekdays;
		this._setCycle(e, { weekdays: n.includes(t) ? n.filter((e) => e !== t) : [...n, t].sort() });
	}
	_weather() {
		let e = this._t, t = this._draft, n = t.receives_rain, r = t.weather_rules, i = this.state?.settings, a = this.zone?.weather;
		return F`<section class="tile" aria-labelledby="hx-weather">
      <span class="stack">
        <h2 id="hx-weather">${e("editor.weather_title")}</h2>
        <span class="tiny">${i?.weather_entity ? e("editor.rain_source", { name: i.weather_name ?? i.weather_entity }) : e("editor.rain_none")}</span>
      </span>
      ${a && i?.weather_entity ? F`<div class="stack">
            <div class="row">
              <span class="grow small">${e("editor.today")}</span>
              <span class="strong">${a.coefficient_pct} %</span>
            </div>
            <div class="meter" role="img" aria-label="${a.coefficient_pct} %">
              <div style="width: ${Math.min(100, a.coefficient_pct)}%"></div>
            </div>
            <span class="tiny">${n ? e("editor.rain_detail", {
			past: a.past_rain_mm ?? 0,
			forecast: a.forecast_rain_mm ?? 0
		}) : e("editor.no_rain_detail")}</span>
          </div>` : L}
      <div>
        <div class="setting">
          <span class="stack"
            ><span class="strong">${e("editor.rain")}</span
            ><span class="tiny">${e(n ? "editor.rain_hint" : "editor.no_rain_desc")}</span></span
          >
          ${this._switch(n, e("editor.rain"), (e) => this._set({ receives_rain: e }))}
        </div>
        ${n ? F`${this._setting(e("editor.skip"), e("editor.skip_hint"), this._stepper(r.skip_mm, {
			min: .5,
			max: 50,
			step: .5,
			unit: "mm",
			what: e("editor.skip")
		}, (e) => this._set({ weather_rules: {
			...r,
			skip_mm: e
		} })))}
            ${this._setting(e("editor.past"), e("editor.past_hint"), this._stepper(r.past_window_h, {
			min: 0,
			max: 96,
			step: 6,
			unit: "h",
			what: e("editor.past")
		}, (e) => this._set({ weather_rules: {
			...r,
			past_window_h: e
		} })))}` : L}
        ${this._setting(e("editor.heat"), e("editor.heat_hint"), this._stepper(r.heat_bonus_pct, {
			min: 0,
			max: 100,
			step: 5,
			signed: !0,
			unit: "%",
			what: e("editor.heat")
		}, (e) => this._set({ weather_rules: {
			...r,
			heat_bonus_pct: e
		} })))}
        ${r.heat_bonus_pct > 0 ? this._setting(e("editor.heat_threshold"), e("editor.heat_threshold_hint"), this._stepper(r.heat_threshold_c, {
			min: 15,
			max: 45,
			step: 1,
			unit: "°C",
			what: e("editor.heat_threshold")
		}, (e) => this._set({ weather_rules: {
			...r,
			heat_threshold_c: e
		} }))) : L}
      </div>
      ${r.heat_bonus_pct > 0 ? F`<span class="tiny">${e("editor.heat_summary", {
			t: r.heat_threshold_c.toLocaleString(X(this.hass)),
			pct: r.heat_bonus_pct
		})}</span>` : L}
    </section>`;
	}
	_validate() {
		let e = this._t, t = this._draft;
		return t.name.trim() ? t.switch_entity ? t.cycles.some((e) => e.weekdays.length === 0) ? e("editor.errors.no_day") : t.cycles.some((e) => e.duration_min > t.max_runtime_min) ? e("editor.errors.duration_exceeds_max") : "" : e("editor.errors.switch") : e("editor.errors.name");
	}
	async _save() {
		let e = this._t;
		if (this._error = this._validate(), this._error) return;
		let t = {
			...this._draft,
			name: this._draft.name.trim(),
			power_entity: this._draft.power_entity || null
		};
		this._saving = !0;
		try {
			let e = await this.hass.callWS({
				type: "hydraxoo/zone/save",
				zone: t
			});
			this.dispatchEvent(new CustomEvent("saved", {
				detail: {
					id: e.id,
					created: !this.zone
				},
				bubbles: !0,
				composed: !0
			}));
		} catch (t) {
			let n = t?.code;
			this._error = n === "duration_exceeds_max" ? e("editor.errors.duration_exceeds_max") : e("editor.errors.generic", { message: t?.message ?? String(t) });
		} finally {
			this._saving = !1;
		}
	}
	async _delete() {
		this.zone && window.confirm(this._t("editor.delete_confirm", { zone: this.zone.name })) && (await this.hass.callWS({
			type: "hydraxoo/zone/delete",
			zone_id: this.zone.id
		}), this._close());
	}
	_close() {
		this.dispatchEvent(new CustomEvent("close", {
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		let e = this._t, t = !this.zone;
		return F`<div class="form" style="display:flex;flex-direction:column;gap:14px">
      <div class="header">
        <div class="header-left">
          <button
            type="button"
            class="icon-button"
            aria-label=${e(t ? "editor.cancel" : "editor.back")}
            @click=${this._close}
          ><ha-icon icon=${t ? "mdi:close" : "mdi:arrow-left"}></ha-icon></button>
          <div class="stack">
            <h1>${t ? e("new_zone") : this.zone.name}</h1>
            ${t ? L : F`<span class="sub">${e("editor.subtitle")}</span>`}
          </div>
        </div>
      </div>
      ${this._general(t)}
      ${this._hardware(!t)}
      ${t ? L : this._cycles()}
      ${t ? L : this._weather()}
      ${this._error ? F`<div class="error-text" role="alert">${this._error}</div>` : L}
      <button type="button" class="btn primary" ?disabled=${this._saving} @click=${this._save}>
        ${this._saving ? e("editor.saving") : e(t ? "editor.create" : "editor.save")}
      </button>
      ${t ? F`<span class="tiny" style="text-align:center">${e("editor.create_hint")}</span>` : F`<button type="button" class="btn danger" @click=${this._delete}>${e("editor.delete")}</button>`}
    </div>`;
	}
};
customElements.get("hydraxoo-zone-form") || customElements.define("hydraxoo-zone-form", Le);
// src/hydraxoo-card.ts
var Re = "0.0.6", ze = class extends K {
	constructor(...e) {
		super(...e), this._config = { type: "custom:hydraxoo-card" }, this._state = null, this._view = { name: "dashboard" }, this._error = "", this._runFor = null, this._runMinutes = 10, this._subscribing = !1;
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			_config: { state: !0 },
			_state: { state: !0 },
			_view: { state: !0 },
			_error: { state: !0 },
			_runFor: { state: !0 },
			_runMinutes: { state: !0 }
		};
	}
	static {
		this.styles = je;
	}
	static getConfigElement() {
		return document.createElement("hydraxoo-card-editor");
	}
	static getStubConfig() {
		return { type: "custom:hydraxoo-card" };
	}
	setConfig(e) {
		if (!e) throw Error("Invalid configuration");
		this._config = { ...e };
	}
	getCardSize() {
		return this._config.compact ? 4 : 10;
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
	connectedCallback() {
		super.connectedCallback(), this._ticker = window.setInterval(() => {
			this._state?.zones.some((e) => e.running) && this.requestUpdate();
		}, 1e3);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), window.clearInterval(this._ticker), this._unsubscribe();
	}
	updated() {
		this.hass && !this._unsub && !this._subscribing && this._subscribe();
	}
	async _subscribe() {
		this._subscribing = !0;
		try {
			this._unsub = await this.hass.connection.subscribeMessage((e) => {
				"reload" in e ? (this._unsubscribe(), window.setTimeout(() => this.requestUpdate(), 1500)) : (this._state = e, this._error = "");
			}, { type: "hydraxoo/subscribe" });
		} catch (e) {
			this._error = e?.code === "not_loaded" || e?.code === "unknown_command" ? "not_loaded" : String(e?.message ?? e), window.setTimeout(() => this.requestUpdate(), 1e4);
		} finally {
			this._subscribing = !1;
		}
	}
	_unsubscribe() {
		let e = this._unsub;
		this._unsub = void 0;
		try {
			e?.();
		} catch {}
	}
	_call(e, t = {}) {
		return this.hass.callWS({
			type: `hydraxoo/${e}`,
			...t
		}).catch((e) => {
			this._error = String(e?.message ?? e);
		});
	}
	get _t() {
		return Z(this.hass);
	}
	get _tz() {
		return this.hass.config.time_zone;
	}
	get _lang() {
		return X(this.hass);
	}
	get _isAdmin() {
		return this.hass.user?.is_admin ?? !1;
	}
	_zones() {
		let e = this._state?.zones ?? [], t = this._config.zones;
		return t?.length ? e.filter((e) => t.includes(e.id)) : e;
	}
	_openSettings() {
		history.pushState(null, "", "/config/integrations/integration/hydraxoo"), window.dispatchEvent(new CustomEvent("location-changed"));
	}
	render() {
		if (!this.hass) return L;
		let e = this._t;
		if (this._error === "not_loaded") return F`<ha-card><div class="small">${e("not_loaded")}</div></ha-card>`;
		if (!this._state) return F`<ha-card><div class="small">${e("loading")}</div></ha-card>`;
		let t = this._view;
		if (t.name === "zone") {
			let e = this._state.zones.find((e) => e.id === t.id);
			if (e) return F`<ha-card>
          <hydraxoo-zone-form
            .hass=${this.hass}
            .zone=${e}
            .state=${this._state}
            @close=${() => this._view = { name: "dashboard" }}
            @saved=${() => this._view = { name: "dashboard" }}
          ></hydraxoo-zone-form>
        </ha-card>`;
		}
		return t.name === "new" ? F`<ha-card>
        <hydraxoo-zone-form
          .hass=${this.hass}
          .zone=${null}
          .state=${this._state}
          @close=${() => this._view = { name: "dashboard" }}
          @saved=${(e) => this._view = {
			name: "zone",
			id: e.detail.id
		}}
        ></hydraxoo-zone-form>
      </ha-card>` : this._dashboard();
	}
	_dashboard() {
		let e = this._t, t = this._state, n = /* @__PURE__ */ new Date(), r = Q(n, this._tz), i = this._zones(), a = !!this._config.compact, o = new Map(i.map((e) => [e.id, Oe(e, r, t.history, this._tz)]));
		return F`<ha-card class=${a ? "compact" : ""}>
      <div class="header">
        <div class="stack">
          <h1>${this._config.title || e("title")}</h1>
          <span class="sub">${we(n, this._tz, this._lang)} · ${$(n, this._tz, this._lang)}</span>
        </div>
        ${this._isAdmin ? F`<button type="button" class="icon-button" aria-label=${e("settings")} @click=${this._openSettings}>
              <ha-icon icon="mdi:cog-outline"></ha-icon>
            </button>` : L}
      </div>
      ${this._pauseBanner()}
      ${this._weatherBanner()}
      ${this._faultBanners(i)}
      ${this._safetyBanner()}
      ${a ? L : this._timeline(i, o, r)}
      ${i.map((e) => this._zoneCard(e, o.get(e.id) ?? []))}
      ${this._isAdmin ? F`<button type="button" class="btn ghost-dashed" @click=${() => this._view = { name: "new" }}>
            <ha-icon icon="mdi:plus"></ha-icon>${e("new_zone")}
          </button>` : L}
      ${this._error && this._error !== "not_loaded" ? F`<div class="error-text" role="alert">${this._error}</div>` : L}
    </ha-card>`;
	}
	_pauseBanner() {
		let e = this._t, t = this._state.settings;
		return t.paused ? F`<div class="tile">
      <div class="row">
        <div class="badge-icon warning"><ha-icon icon="mdi:pause"></ha-icon></div>
        <span class="stack grow">
          <span class="strong">${e("pause.paused")}</span>
          <span class="small">${t.pause_until ? e("pause.until", { date: `${we(t.pause_until, this._tz, this._lang)} ${$(t.pause_until, this._tz, this._lang)}` }) : e("pause.indefinite")}</span>
        </span>
        <button type="button" class="btn" @click=${() => this._call("resume")}>${e("pause.resume")}</button>
      </div>
    </div>` : L;
	}
	_weatherBanner() {
		let e = this._t, t = this._state;
		if (!t.settings.weather_entity) return L;
		let n = t.weather;
		if (n.warnings.includes("weather_unavailable")) return F`<div class="tile"><div class="row">
        <div class="badge-icon warning"><ha-icon icon="mdi:weather-cloudy-alert"></ha-icon></div>
        <span class="stack grow">
          <span class="strong">${e("weather.unavailable")}</span>
          <span class="small">${e("weather.unavailable_detail")}</span>
        </span>
        <span class="big-number">100 %</span>
      </div></div>`;
		let r = n.past_rain_mm ?? 0, i = n.forecast_rain_mm ?? 0, a = n.past_rain_mm ? e("weather.rain", {
			past: r,
			forecast: i
		}) : e("weather.rain_forecast", { forecast: i }), o = n.warnings.includes("no_precipitation_data") ? e("weather.no_data") : n.skip ? e("weather.skipped") : n.heat_bonus_pct ? e("weather.heat", {
			bonus: n.heat_bonus_pct,
			temp: n.temperature_c ?? ""
		}) : e("weather.adjusted");
		return F`<div class="tile"><div class="row">
      <div class="badge-icon warning"><ha-icon icon=${i || r ? "mdi:weather-rainy" : "mdi:weather-partly-cloudy"}></ha-icon></div>
      <span class="stack grow">
        <span class="strong">${a}</span>
        <span class="small">${o}</span>
      </span>
      <span class="stack">
        <span class="big-number">${n.coefficient_pct} %</span>
        <span class="tiny" style="text-align:right">${e("weather.of_durations")}</span>
      </span>
    </div></div>`;
	}
	_faultBanners(e) {
		let t = this._t;
		return e.filter((e) => e.fault).map((e) => F`<div class="tile" role="alert"><div class="row">
          <div class="badge-icon error"><ha-icon icon="mdi:valve-closed"></ha-icon></div>
          <span class="stack grow">
            <span class="strong">${t("safety.failed", { zone: e.name })}</span>
            <span class="small">${t("safety.failed_detail", {
			power: e.last_check?.power_w ?? "?",
			n: e.last_check?.retries ?? e.safety.max_attempts
		})}</span>
          </span>
          <button type="button" class="btn" @click=${() => this._call("zone/acknowledge", { zone_id: e.id })}>
            ${t("safety.acknowledge")}
          </button>
        </div></div>`);
	}
	_safetyBanner() {
		let e = this._t, t = this._state.last_check;
		if (!t || t.result === "failed") return L;
		let n = this._state.zones.find((e) => e.id === t.zone_id), r = $(t.time, this._tz, this._lang), i, a, o = "success";
		return t.result === "sensor_unavailable" ? (i = e("safety.unavailable", { zone: t.zone_name }), a = e("safety.unavailable_detail", { time: r }), o = "warning") : t.retries > 0 ? (i = e("safety.retried", {
			zone: t.zone_name,
			time: r
		}), a = be(e, "safety.retried_detail", t.retries, { s: n?.safety.retry_pulse_s ?? 5 }), o = "warning") : (i = e("safety.confirmed", {
			zone: t.zone_name,
			time: r
		}), a = e("safety.confirmed_detail")), F`<div class="tile"><div class="row">
      <div class="badge-icon ${o}"><ha-icon icon="mdi:shield-check-outline"></ha-icon></div>
      <span class="stack grow">
        <span class="strong">${i}</span>
        <span class="tiny">${a}</span>
      </span>
    </div></div>`;
	}
	_timeline(e, t, n) {
		let r = this._t;
		if (!e.length) return L;
		let i = [...t.values()].reduce((e, t) => e + ke(t), 0), a = n.minutes / 1440 * 100, o = new Set([...t.values()].flat().map((e) => e.status.kind));
		return F`<section class="tile" aria-labelledby="hx-today">
      <div class="row">
        <h2 id="hx-today" class="grow">${r("timeline.title")}</h2>
        <span class="small">${r("timeline.total", { min: i })}</span>
      </div>
      <div class="timeline">
        ${e.map((e) => {
			let n = t.get(e.id) ?? [];
			return F`<span class="label">${e.name}</span>
            <div class="track" role="img" aria-label=${r("timeline.label", {
				zone: e.name,
				count: n.length
			})}>
              ${n.map((e) => {
				let t = e.start / 1440 * 100, n = Math.max(e.adjusted, e.base) / 1440 * 100;
				return F`<div
                  class="mark ${e.status.kind}"
                  style="left: ${t}%; width: ${n}%"
                  title="${e.cycle.start_time} · ${e.status.kind === "skipped" ? r(`zone.skip.${e.status.reason}`) : `${e.adjusted} min`}"
                ></div>`;
			})}
              <div class="now" style="left: ${a}%"></div>
            </div>`;
		})}
        <span></span>
        <div class="hours"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>
      </div>
      <div class="legend">
        ${o.has("running") ? F`<span><span class="swatch running"></span>${r("timeline.running")}</span>` : L}
        <span><span class="swatch done"></span>${r("timeline.done")}</span>
        ${o.has("skipped") ? F`<span><span class="swatch skipped"></span>${r("timeline.skipped")}</span>` : L}
        <span><span class="swatch"></span>${r("timeline.upcoming")}</span>
        <span><span class="swatch disabled"></span>${r("timeline.disabled")}</span>
        <span><span class="swatch nowline"></span>${r("timeline.now")}</span>
      </div>
    </section>`;
	}
	_remaining(e) {
		return e.run ? Math.max(0, (new Date(e.run.ends).getTime() - Date.now()) / 1e3) : e.remaining_s;
	}
	_chips(e) {
		let t = this._t, n = [];
		if (e.fault && n.push(F`<span class="chip error">${t("zone.fault")}</span>`), e.running && n.push(F`<span class="chip success"><ha-icon icon="mdi:water"></ha-icon>${t("zone.running", { left: Te(this._remaining(e)) })}</span>`), e.queued && n.push(F`<span class="chip warning">${t("zone.queued")}</span>`), e.checking && n.push(F`<span class="chip warning">${t("zone.checking")}</span>`), e.enabled || n.push(F`<span class="chip muted">${t("zone.disabled")}</span>`), e.next_run && !e.running) {
			let r = new Date(e.next_run.time), i = Q(r, this._tz).dateKey === Q(/* @__PURE__ */ new Date(), this._tz).dateKey, a = $(r, this._tz, this._lang), o = e.next_run.adjusted_duration_min, s = ye(this.hass).long[Q(r, this._tz).weekday], c = `zone.${i ? "next" : "next_day"}${o === 0 ? "_skipped" : ""}`;
			n.push(F`<span class="chip ${o === 0 ? "muted" : ""}"><ha-icon icon="mdi:clock-outline"></ha-icon>${t(c, {
				time: a,
				min: o,
				day: s
			})}</span>`);
		} else !e.next_run && e.enabled && !e.running && n.push(F`<span class="chip muted">${t("zone.nothing")}</span>`);
		if (this._state.settings.weather_entity) {
			let r = e.weather;
			r.skip || r.coefficient_pct === 0 ? n.push(F`<span class="chip warning"><ha-icon icon="mdi:weather-rainy"></ha-icon>${t("zone.weather_skip")}</span>`) : r.coefficient_pct !== 100 && n.push(F`<span class="chip warning">${t("zone.weather", { pct: r.coefficient_pct })}</span>`);
		}
		return n;
	}
	_statusLabel(e) {
		let t = this._t, n = e.status;
		switch (n.kind) {
			case "running": return F`<span class="status running">${t("zone.status.running")}</span>`;
			case "done": return F`<span class="status"><ha-icon icon="mdi:check"></ha-icon>${t("zone.status.done")}</span>`;
			case "skipped": return F`<span class="status skipped"><ha-icon icon="mdi:close"></ha-icon>${t(`zone.skip.${n.reason}`)}</span>`;
			case "disabled": return F`<span class="status">${t("zone.status.disabled")}</span>`;
			case "past": return F`<span class="status">—</span>`;
			case "upcoming": {
				let e;
				return e = n.inMinutes < 60 ? t("zone.status.in_min", { m: n.inMinutes }) : n.startMinutes >= 1080 && n.inMinutes >= 180 ? t("zone.status.tonight") : t("zone.status.in_h", { h: Math.round(n.inMinutes / 60) }), F`<span class="status upcoming">${e}</span>`;
			}
		}
	}
	_zoneCard(e, t) {
		let n = this._t, r = e.running || e.queued;
		return F`<section class="tile" aria-labelledby="hx-zone-${e.id}">
      <div class="row">
        <div class="badge-icon"><ha-icon .icon=${e.icon}></ha-icon></div>
        <span class="stack grow">
          <span id="hx-zone-${e.id}" class="strong" style="font-size:17px">${e.name}</span>
          <span class="small zone-sub"
            >${n(e.receives_rain ? "zone.rain" : "zone.no_rain")}${e.weather_rules.heat_bonus_pct > 0 ? n("zone.heat") : ""}</span
          >
        </span>
        <button
          type="button"
          class="switch"
          role="switch"
          aria-checked=${e.enabled ? "true" : "false"}
          aria-label=${n("zone.enable", { zone: e.name })}
          @click=${() => this._call("zone/enable", {
			zone_id: e.id,
			enabled: !e.enabled
		})}
        ></button>
      </div>
      <div class="chips">${this._chips(e)}</div>
      <div class="cycles">
        ${t.length ? t.map((e) => {
			let t = [
				"done",
				"past",
				"disabled",
				"skipped"
			].includes(e.status.kind), n = e.adjusted !== e.base && e.status.kind !== "skipped";
			return F`<div class="cycle-row ${t ? "muted" : ""}">
                <span class="time">${e.cycle.start_time}</span>
                <span class="dur">
                  ${e.status.kind === "skipped" ? F`<s>${e.base} min</s>` : F`${n ? F`<s>${e.base} min</s>` : L}<b>${n ? e.adjusted : e.base} min</b>`}
                </span>
                ${this._statusLabel(e)}
              </div>`;
		}) : F`<div class="cycle-row muted"><span class="small" style="grid-column: 1 / -1">${n("zone.no_cycle_today")}</span></div>`}
      </div>
      ${this._runFor === e.id ? this._runPicker(e) : F`<div class="actions">
        ${r ? F`<button type="button" class="btn grow" @click=${() => this._call("zone/stop", { zone_id: e.id })}>
              <ha-icon icon="mdi:stop"></ha-icon>${n("zone.stop")}
            </button>` : F`<button
              type="button"
              class="btn primary grow"
              ?disabled=${e.fault}
              @click=${() => {
			this._runFor = e.id, this._runMinutes = Math.min(e.cycles.find((e) => e.enabled)?.duration_min ?? 10, e.max_runtime_min);
		}}
            ><ha-icon icon="mdi:play"></ha-icon>${n("zone.water_now")}</button>`}
        ${this._isAdmin ? F`<button type="button" class="btn" @click=${() => this._view = {
			name: "zone",
			id: e.id
		}}>${n("zone.edit")}</button>` : L}
      </div>`}
    </section>`;
	}
	_runPicker(e) {
		let t = this._t, n = (t) => this._runMinutes = Math.min(e.max_runtime_min, Math.max(1, t));
		return F`<div class="row" style="flex-wrap: wrap">
      <span class="strong">${t("zone.duration")}</span>
      <span class="stepper">
        <button type="button" aria-label=${t("editor.decrease", { what: t("zone.duration") })} @click=${() => n(this._runMinutes - 1)}>−</button>
        <span class="value" aria-live="polite">${this._runMinutes} min</span>
        <button type="button" aria-label=${t("editor.increase", { what: t("zone.duration") })} @click=${() => n(this._runMinutes + 1)}>+</button>
      </span>
      <span class="grow"></span>
      <button type="button" class="btn" @click=${() => this._runFor = null}>${t("zone.cancel")}</button>
      <button
        type="button"
        class="btn primary"
        @click=${() => {
			this._runFor = null, this._call("zone/run", {
				zone_id: e.id,
				duration: this._runMinutes
			});
		}}
      >${t("zone.start")}</button>
    </div>`;
	}
};
customElements.get("hydraxoo-card") || customElements.define("hydraxoo-card", ze), window.customCards = window.customCards ?? [], window.customCards.some((e) => e.type === "hydraxoo-card") || window.customCards.push({
	type: "hydraxoo-card",
	name: "hydraXoo",
	description: "Zone-based irrigation: schedule, weather and valve safety.",
	preview: !1
}), console.info(`%c hydraXoo card %c ${Re} `, "background:#1d4ed8;color:#fff", "");
export { ze as HydraxooCard };
