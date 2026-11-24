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
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: ee, getPrototypeOf: te } = Object, p = globalThis, ne = p.trustedTypes, re = ne ? ne.emptyScript : "", ie = p.reactiveElementPolyfillSupport, m = (e, t) => e, h = {
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
}, g = (e, t) => !l(e, t), ae = {
	attribute: !0,
	type: String,
	converter: h,
	reflect: !1,
	useDefault: !1,
	hasChanged: g
};
Symbol.metadata ??= Symbol("metadata"), p.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var _ = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ae) {
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
		return this.elementProperties.get(e) ?? ae;
	}
	static _$Ei() {
		if (this.hasOwnProperty(m("elementProperties"))) return;
		let e = te(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(m("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(m("properties"))) {
			let e = this.properties, t = [...f(e), ...ee(e)];
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
_.elementStyles = [], _.shadowRootOptions = { mode: "open" }, _[m("elementProperties")] = /* @__PURE__ */ new Map(), _[m("finalized")] = /* @__PURE__ */ new Map(), ie?.({ ReactiveElement: _ }), (p.reactiveElementVersions ??= []).push("2.1.2");
// node_modules/lit-html/lit-html.js
var v = globalThis, y = (e) => e, b = v.trustedTypes, x = b ? b.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, S = "$lit$", C = `lit$${Math.random().toFixed(9).slice(2)}$`, oe = "?" + C, se = `<${oe}>`, w = document, T = () => w.createComment(""), E = (e) => e === null || typeof e != "object" && typeof e != "function", D = Array.isArray, ce = (e) => D(e) || typeof e?.[Symbol.iterator] == "function", O = "[ 	\n\f\r]", k = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, A = /-->/g, j = />/g, M = RegExp(`>|${O}(?:([^\\s"'>=/]+)(${O}*=${O}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), le = /'/g, ue = /"/g, de = /^(?:script|style|textarea|title)$/i, N = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), P = Symbol.for("lit-noChange"), F = Symbol.for("lit-nothing"), I = /* @__PURE__ */ new WeakMap(), L = w.createTreeWalker(w, 129);
function R(e, t) {
	if (!D(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return x === void 0 ? t : x.createHTML(t);
}
var fe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = k;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === k ? c[1] === "!--" ? o = A : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = M) : (de.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = M) : o = j : o === M ? c[0] === ">" ? (o = i ?? k, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? M : c[3] === "\"" ? ue : le) : o === ue || o === le ? o = M : o === A || o === j ? o = k : (o = M, i = void 0);
		let d = o === M && e[t + 1].startsWith("/>") ? " " : "";
		a += o === k ? n + se : l >= 0 ? (r.push(s), n.slice(0, l) + S + n.slice(l) + C + d) : n + C + (l === -2 ? t : d);
	}
	return [R(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, z = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = fe(t, n);
		if (this.el = e.createElement(l, r), L.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = L.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(S)) {
					let t = u[o++], n = i.getAttribute(e).split(C), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? me : r[1] === "?" ? he : r[1] === "@" ? ge : H
					}), i.removeAttribute(e);
				} else e.startsWith(C) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (de.test(i.tagName)) {
					let e = i.textContent.split(C), t = e.length - 1;
					if (t > 0) {
						i.textContent = b ? b.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], T()), L.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], T());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === oe) c.push({
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
		let n = w.createElement("template");
		return n.innerHTML = e, n;
	}
};
function B(e, t, n = e, r) {
	if (t === P) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = E(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = B(e, i._$AS(e, t.values), i, r)), t;
}
var pe = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? w).importNode(t, !0);
		L.currentNode = r;
		let i = L.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new V(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new _e(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = L.nextNode(), a++);
		}
		return L.currentNode = w, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, V = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = F, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = B(this, e, t), E(e) ? e === F || e == null || e === "" ? (this._$AH !== F && this._$AR(), this._$AH = F) : e !== this._$AH && e !== P && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ce(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== F && E(this._$AH) ? this._$AA.nextSibling.data = e : this.T(w.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = z.createElement(R(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new pe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = I.get(e.strings);
		return t === void 0 && I.set(e.strings, t = new z(e)), t;
	}
	k(t) {
		D(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(T()), this.O(T()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = y(e).nextSibling;
			y(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, H = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = F, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = F;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = B(this, e, t, 0), a = !E(e) || e !== this._$AH && e !== P, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = B(this, r[n + o], t, o), s === P && (s = this._$AH[o]), a ||= !E(s) || s !== this._$AH[o], s === F ? e = F : e !== F && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === F ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, me = class extends H {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === F ? void 0 : e;
	}
}, he = class extends H {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== F);
	}
}, ge = class extends H {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = B(this, e, t, 0) ?? F) === P) return;
		let n = this._$AH, r = e === F && n !== F || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== F && (n === F || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, _e = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		B(this, e);
	}
}, ve = v.litHtmlPolyfillSupport;
ve?.(z, V), (v.litHtmlVersions ??= []).push("3.3.3");
var ye = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new V(t.insertBefore(T(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, U = globalThis, W = class extends _ {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = ye(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return P;
	}
};
W._$litElement$ = !0, W.finalized = !0, U.litElementHydrateSupport?.({ LitElement: W });
var be = U.litElementPolyfillSupport;
be?.({ LitElement: W }), (U.litElementVersions ??= []).push("4.2.2");
var xe = {
	title: "Bewässerung",
	loading: "Wird geladen…",
	not_loaded: "hydraXoo ist nicht geladen. Fügen Sie die Integration unter Einstellungen › Geräte & Dienste hinzu.",
	settings: "Allgemeine Einstellungen",
	weather: {
		rain: "Regen: {past} mm gefallen, {forecast} mm erwartet",
		rain_forecast: "Regen: {forecast} mm erwartet",
		adjusted: "Dauern automatisch angepasst",
		skipped: "Genug Regen erwartet: Zyklen der Zonen mit Regen werden übersprungen",
		of_durations: "der Dauern",
		unavailable: "Wetter nicht verfügbar",
		unavailable_detail: "Die Zonen bewässern ihre volle Dauer",
		no_data: "Der Wetteranbieter liefert keine Regenmengen",
		heat: "Hitzebonus +{bonus} % ({temp} °C)"
	},
	pause: {
		paused: "Bewässerung pausiert",
		until: "Bis {date}",
		indefinite: "Bis zur Fortsetzung",
		resume: "Fortsetzen",
		pause: "Bewässerung pausieren"
	},
	safety: {
		confirmed: "{zone} · Schließen um {time} geprüft",
		confirmed_detail: "Das Ventil hat normal geschlossen",
		retried: "{zone} · Schließen um {time} geprüft",
		retried_detail_one: "Restverbrauch erkannt: nach {n} Versuch von {s} s geschlossen",
		retried_detail_other: "Restverbrauch erkannt: nach {n} Versuchen von {s} s geschlossen",
		failed: "{zone}: Ventil nicht geschlossen",
		failed_detail: "Noch {power} W nach {n} Versuchen. Diese Zone bewässert nicht mehr.",
		acknowledge: "Quittieren",
		unavailable: "{zone} · Schließen nicht geprüft",
		unavailable_detail: "Leistungssensor um {time} nicht verfügbar"
	},
	timeline: {
		title: "Heute",
		total: "{min} Min. Bewässerung",
		running: "Läuft",
		done: "Erledigt",
		skipped: "Übersprungen",
		upcoming: "Geplant",
		disabled: "Deaktiviert",
		now: "Jetzt",
		label: "{zone}: {count} Zyklen heute"
	},
	zone: {
		rain: "Bekommt Regen · angepasste Dauer",
		no_rain: "Vor Regen geschützt",
		heat: " · Hitzebonus",
		enable: "Zone {zone} aktivieren",
		next: "Nächste: {time} · {min} min",
		next_day: "Nächste: {day} {time} · {min} min",
		next_skipped: "Nächste: {time} · übersprungen (Regen)",
		next_day_skipped: "Nächste: {day} {time} · übersprungen (Regen)",
		nothing: "Kein Zyklus geplant",
		weather: "Wetter: {pct} % der Dauer",
		weather_skip: "Regen: Bewässerung übersprungen",
		running: "Bewässerung · noch {left}",
		queued: "Wartet, bis sie an der Reihe ist",
		checking: "Schließen wird geprüft…",
		fault: "Schließfehler",
		disabled: "Zone deaktiviert",
		no_cycle_today: "Heute kein Zyklus",
		water_now: "Jetzt bewässern",
		stop: "Stoppen",
		edit: "Bearbeiten",
		start: "Starten",
		cancel: "Abbrechen",
		duration: "Dauer",
		status: {
			done: "Erledigt",
			running: "Jetzt",
			disabled: "Deaktiviert",
			missed: "Nicht gelaufen",
			in_min: "in {m} Min.",
			in_h: "in {h} Std.",
			tonight: "heute Abend"
		},
		skip: {
			weather: "Übersprungen · Regen",
			paused: "Übersprungen · Pause",
			zone_disabled: "Übersprungen · Zone aus",
			fault: "Übersprungen · Störung",
			stopped: "Übersprungen · gestoppt"
		},
		external: "Außerhalb von hydraXoo geöffnet · schließt in {left}",
		capped: "Durch die Sicherheitsabschaltung auf {cutoff} Min. begrenzt"
	},
	new_zone: "Neue Zone",
	editor: {
		subtitle: "Zoneneinstellungen",
		back: "Zurück zur Übersicht",
		cancel: "Abbrechen und zurück",
		general: "Zone",
		name: "Name",
		name_placeholder: "Z. B. Rosenbeet",
		icon: "Symbol",
		icons: {
			plant: "Pflanze",
			tree: "Baum",
			lawn: "Rasen",
			flower: "Blumen",
			drop: "Tropfen"
		},
		hardware: "Hardware",
		valve: "Magnetventil",
		switch: "Ventilschalter · erforderlich",
		switch_choose: "Schalter-Entität wählen…",
		power: "Leistungssensor · empfohlen",
		power_choose: "Leistungssensor (W) wählen…",
		power_hint: "Der Sensor prüft, ob das Ventil wirklich geschlossen ist.",
		online: "Online",
		offline: "Nicht verfügbar",
		check: "Schließen prüfen",
		threshold: "Ventil gilt als offen über",
		threshold_hint: "Messung nach dem Schließen",
		delay: "Prüfverzögerung",
		delay_hint: "Nach dem Schließbefehl",
		pulse: "Wiederholung",
		pulse_hint: "Öffnen und wieder schließen",
		attempts: "Maximale Versuche",
		attempts_hint: "Dann Alarm und Benachrichtigung",
		cutoff: "Sicherheitsabschaltung",
		cutoff_hint: "Zwangsstopp, wenn das Ventil offen bleibt",
		cycles: "Zyklen",
		today_total: "{min} Min. heute",
		no_cycle: "Noch kein Zyklus: Diese Zone bewässert nur auf Anforderung.",
		cycle: "Zyklus {n}",
		every_day: "Jeden Tag",
		weekdays_only: "Werktags",
		weekend: "Wochenende",
		n_days: "{n} Tage / Woche",
		no_day: "Kein Tag gewählt",
		enable_cycle: "Zyklus {n} aktivieren",
		delete_cycle: "Zyklus {n} löschen",
		start_time: "Startzeit von Zyklus {n}",
		day_label: "{day}, Zyklus {n}",
		decrease: "{what} verringern",
		increase: "{what} erhöhen",
		duration_of: "die Dauer von Zyklus {n}",
		add_cycle: "Zyklus hinzufügen",
		rain: "Bekommt Regen",
		rain_source: "Quelle: {name}",
		rain_none: "Noch keine Wetter-Entität: Wählen Sie eine in den allgemeinen Einstellungen der Integration.",
		today: "Heute",
		rain_detail: "{past} mm gefallen · {forecast} mm erwartet",
		skip: "Zyklus überspringen, wenn erwarteter Regen erreicht",
		skip_hint: "Erwarteter Regen in den nächsten 24 Stunden",
		past: "Berücksichtigter gefallener Regen",
		past_hint: "Über die letzten Stunden",
		heat: "An heißen Tagen mehr bewässern",
		heat_hint: "Dauer um diesen Prozentsatz verlängert · 0 % = normale Dauer",
		heat_threshold: "Heißer Tag ab",
		heat_threshold_hint: "Höchste erwartete Tagestemperatur",
		heat_summary: "Wenn der Tag {t} °C oder mehr erreichen soll, wird die Dauer um {pct} % verlängert.",
		save: "Speichern",
		saving: "Wird gespeichert…",
		create: "Erstellen und Zyklen hinzufügen",
		create_hint: "Die Zyklen werden im nächsten Schritt eingestellt.",
		delete: "Diese Zone löschen",
		delete_confirm: "Zone {zone} löschen? Ihre Zyklen und Entitäten werden entfernt.",
		errors: {
			name: "Geben Sie einen Namen ein.",
			switch: "Wählen Sie den Ventilschalter.",
			no_day: "Jeder Zyklus braucht mindestens einen Tag.",
			duration_exceeds_max: "Ein Zyklus dauert länger als die Sicherheitsabschaltung.",
			generic: "Speichern fehlgeschlagen: {message}"
		},
		rain_choice: "Regen",
		receives_rain: "Bekommt Regen",
		receives_rain_desc: "Dauern an den Regen angepasst",
		no_rain: "Vor Regen geschützt",
		no_rain_desc: "Gewächshaus, überdachter Bereich: Regen wird ignoriert",
		weather_title: "Wetter",
		rain_hint: "Dauer an gefallenen und erwarteten Regen angepasst",
		no_rain_detail: "Regen ignoriert: Nur Hitze kann die Dauer ändern",
		cutoff_warning: "Dieser Zyklus wird nach {cutoff} Min. von der Sicherheitsabschaltung gestoppt. Damit er {min} Min. dauert, erhöhen Sie die Sicherheitsabschaltung.",
		raise_cutoff: "Abschaltung auf {min} Min. setzen",
		frost: "Frostwarnung",
		frost_hint: "Für eine frostgeschützte Zone (beheiztes Gewächshaus) ausschalten"
	},
	days: {
		short: [
			"M",
			"D",
			"M",
			"D",
			"F",
			"S",
			"S"
		],
		long: [
			"Montag",
			"Dienstag",
			"Mittwoch",
			"Donnerstag",
			"Freitag",
			"Samstag",
			"Sonntag"
		]
	},
	card_editor: {
		title: "Titel",
		compact: "Kompakte Anzeige",
		zones: "Angezeigte Zonen (alle, wenn leer)"
	},
	settings_screen: {
		weather: "Wetter",
		weather_entity: "Wetter-Entität",
		weather_hint: "Dient zur Anpassung der Bewässerung an Regen und Hitze. Stündliche Vorhersagen liefern die besten Ergebnisse.",
		rain_sensor: "Regenmesser (optional)",
		rain_hint: "Kumulativ, in mm. Ohne ihn wird der gefallene Regen aus der Vorhersage geschätzt.",
		none: "Keine",
		order: "Bewässerungsreihenfolge",
		sequential: "Eine Zone nach der anderen",
		sequential_desc: "Die anderen warten, bis sie an der Reihe sind",
		parallel: "Zonen parallel",
		parallel_desc: "Jede Zone startet zu ihrer Zeit",
		pause: "Pause",
		pause_off: "Die Bewässerung ist aktiv. Pausieren für:",
		pause_day: "1 Tag",
		pause_days: "{n} Tage",
		pause_until_resumed: "Bis zur Fortsetzung",
		alerts: "Alarme",
		alerts_hint: "Telefone, die mit hoher Priorität alarmiert werden, wenn ein Ventil trotz der Versuche offen bleibt.",
		no_phone: "Kein Telefon mit der Home-Assistant-App gefunden.",
		test: "Testbenachrichtigung senden",
		test_sent: "Testbenachrichtigung gesendet.",
		test_failed: "Senden fehlgeschlagen an: {names}",
		advanced: "Erweiterte Einstellungen der Integration",
		external: "Ventil außerhalb von hydraXoo eingeschaltet",
		external_close: "Sofort schließen",
		external_close_desc: "Als Störung behandelt und gemeldet",
		external_allow: "Offen lassen",
		external_allow_desc: "Durch die Sicherheitsabschaltung geschlossen",
		frost: "Frost",
		frost_hint: "Alarmiert die gewählten Telefone, wenn Frost vorhergesagt ist und Zyklen geplant sind.",
		frost_no_weather: "Benötigt eine Wetter-Entität.",
		frost_alert: "Frostwarnung",
		frost_alert_hint: "Ein Alarm, dann eine Erinnerung etwa 3 Std. vor dem Frost, falls niemand bestätigt hat.",
		frost_threshold: "Frostschwelle",
		frost_threshold_hint: "Niedrigste vorhergesagte Temperatur über 24 Std.",
		frost_thaw: "Meldung bei Frostende",
		frost_thaw_hint: "Auch melden, wenn der Frost vorbei ist"
	},
	unexpected: {
		title: "{zone}: unerwartete Öffnung um {time}",
		detail: "Das Ventil wurde außerhalb von hydraXoo eingeschaltet und wieder geschlossen."
	},
	frost: {
		title: "Frost vorhergesagt: {temp} gegen {time}",
		detail: "Denken Sie daran, die Außenwasserleitungen abzusperren.",
		done: "Erledigt",
		pause: "Bewässerung pausieren",
		confirmed: "Außenleitungen als abgesperrt gemeldet"
	}
}, G = {
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
		},
		external: "Open outside hydraXoo · closes in {left}",
		capped: "Limited to {cutoff} min by the safety cut-off"
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
		heat_hint: "Duration increased by this percentage · 0 % = normal duration",
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
		no_rain_detail: "Rain ignored: only heat can change the duration",
		cutoff_warning: "This cycle will be stopped after {cutoff} min by the safety cut-off. For it to last {min} min, raise the safety cut-off.",
		raise_cutoff: "Set the cut-off to {min} min",
		frost: "Frost warning",
		frost_hint: "Turn off for a zone protected from frost (heated greenhouse)"
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
	},
	settings_screen: {
		weather: "Weather",
		weather_entity: "Weather entity",
		weather_hint: "Used to adjust watering to rain and heat. Hourly forecasts give the best results.",
		rain_sensor: "Rain gauge (optional)",
		rain_hint: "Cumulative, in mm. Without it, the rain fallen is estimated from the forecast.",
		none: "None",
		order: "Watering order",
		sequential: "One zone at a time",
		sequential_desc: "The others wait their turn",
		parallel: "Zones in parallel",
		parallel_desc: "Each zone starts at its own time",
		pause: "Pause",
		pause_off: "Watering is active. Pause it for:",
		pause_day: "1 day",
		pause_days: "{n} days",
		pause_until_resumed: "Until resumed",
		alerts: "Alerts",
		alerts_hint: "Phones alerted with high priority if a valve stays open despite the retries.",
		no_phone: "No phone with the Home Assistant app was found.",
		test: "Send a test notification",
		test_sent: "Test notification sent.",
		test_failed: "Could not send to: {names}",
		advanced: "Advanced settings of the integration",
		external: "Valve switched on outside hydraXoo",
		external_close: "Close it at once",
		external_close_desc: "Treated as a fault and reported",
		external_allow: "Leave it open",
		external_allow_desc: "Closed by the safety cut-off",
		frost: "Frost",
		frost_hint: "Alerts the chosen phones when frost is forecast while cycles are scheduled.",
		frost_no_weather: "Needs a weather entity.",
		frost_alert: "Frost warning",
		frost_alert_hint: "One alert, then one reminder about 3 h before the frost if nobody confirmed.",
		frost_threshold: "Frost threshold",
		frost_threshold_hint: "Lowest temperature forecast over 24 h",
		frost_thaw: "End-of-frost notice",
		frost_thaw_hint: "Also tell when the frost is over"
	},
	unexpected: {
		title: "{zone}: unexpected opening at {time}",
		detail: "The valve was switched on outside hydraXoo and has been closed."
	},
	frost: {
		title: "Frost forecast: {temp} around {time}",
		detail: "Remember to shut the outdoor water circuits.",
		done: "Done",
		pause: "Pause watering",
		confirmed: "Outdoor circuits reported shut"
	}
}, Se = {
	de: xe,
	en: G,
	es: {
		title: "Riego",
		loading: "Cargando…",
		not_loaded: "hydraXoo no está cargado. Añada la integración en Ajustes › Dispositivos y servicios.",
		settings: "Ajustes generales",
		weather: {
			rain: "Lluvia: {past} mm caídos, {forecast} mm previstos",
			rain_forecast: "Lluvia: {forecast} mm previstos",
			adjusted: "Duraciones ajustadas automáticamente",
			skipped: "Suficiente lluvia prevista: ciclos omitidos en las zonas que reciben lluvia",
			of_durations: "de las duraciones",
			unavailable: "Meteorología no disponible",
			unavailable_detail: "Las zonas riegan su duración completa",
			no_data: "El proveedor meteorológico no da cantidades de lluvia",
			heat: "Bono de calor +{bonus} % ({temp} °C)"
		},
		pause: {
			paused: "Riego en pausa",
			until: "Hasta el {date}",
			indefinite: "Hasta reanudar",
			resume: "Reanudar",
			pause: "Pausar el riego"
		},
		safety: {
			confirmed: "{zone} · cierre comprobado a las {time}",
			confirmed_detail: "La válvula se cerró con normalidad",
			retried: "{zone} · cierre comprobado a las {time}",
			retried_detail_one: "Consumo residual detectado: cerrada tras {n} reintento de {s} s",
			retried_detail_other: "Consumo residual detectado: cerrada tras {n} reintentos de {s} s",
			failed: "{zone}: válvula no cerrada",
			failed_detail: "Todavía {power} W tras {n} reintentos. Esta zona ya no riega.",
			acknowledge: "Confirmar",
			unavailable: "{zone} · cierre no comprobado",
			unavailable_detail: "Sensor de consumo no disponible a las {time}"
		},
		timeline: {
			title: "Hoy",
			total: "{min} min de riego",
			running: "En curso",
			done: "Hecho",
			skipped: "Omitido",
			upcoming: "Próximo",
			disabled: "Desactivado",
			now: "Ahora",
			label: "{zone}: {count} ciclos hoy"
		},
		zone: {
			rain: "Recibe lluvia · duración ajustada",
			no_rain: "Protegida de la lluvia",
			heat: " · bono de calor",
			enable: "Activar la zona {zone}",
			next: "Próximo: {time} · {min} min",
			next_day: "Próximo: {day} {time} · {min} min",
			next_skipped: "Próximo: {time} · omitido (lluvia)",
			next_day_skipped: "Próximo: {day} {time} · omitido (lluvia)",
			nothing: "Ningún ciclo programado",
			weather: "Meteorología: {pct} % de la duración",
			weather_skip: "Lluvia: riego omitido",
			running: "Regando · quedan {left}",
			queued: "Esperando su turno",
			checking: "Comprobando el cierre…",
			fault: "Fallo de cierre",
			disabled: "Zona desactivada",
			no_cycle_today: "Ningún ciclo hoy",
			water_now: "Regar ahora",
			stop: "Detener",
			edit: "Editar",
			start: "Iniciar",
			cancel: "Cancelar",
			duration: "Duración",
			status: {
				done: "Hecho",
				running: "Ahora",
				disabled: "Desactivado",
				missed: "No ejecutado",
				in_min: "en {m} min",
				in_h: "en {h} h",
				tonight: "esta noche"
			},
			skip: {
				weather: "Omitido · lluvia",
				paused: "Omitido · pausa",
				zone_disabled: "Omitido · zona inactiva",
				fault: "Omitido · fallo",
				stopped: "Omitido · detenido"
			},
			external: "Abierta fuera de hydraXoo · se cierra en {left}",
			capped: "Limitado a {cutoff} min por el corte de seguridad"
		},
		new_zone: "Nueva zona",
		editor: {
			subtitle: "Ajustes de la zona",
			back: "Volver al panel",
			cancel: "Cancelar y volver",
			general: "Zona",
			name: "Nombre",
			name_placeholder: "Ej.: Rosaleda",
			icon: "Icono",
			icons: {
				plant: "Planta",
				tree: "Árbol",
				lawn: "Césped",
				flower: "Flores",
				drop: "Gota"
			},
			hardware: "Material",
			valve: "Electroválvula",
			switch: "Interruptor de la válvula · obligatorio",
			switch_choose: "Elegir una entidad switch…",
			power: "Sensor de consumo · recomendado",
			power_choose: "Elegir un sensor de consumo (W)…",
			power_hint: "El sensor comprueba que la válvula se ha cerrado de verdad.",
			online: "En línea",
			offline: "No disponible",
			check: "Comprobar el cierre",
			threshold: "Válvula considerada abierta por encima de",
			threshold_hint: "Medición tras el cierre",
			delay: "Retardo de comprobación",
			delay_hint: "Tras la orden de cierre",
			pulse: "Reintento",
			pulse_hint: "Abrir y volver a cerrar",
			attempts: "Reintentos máximos",
			attempts_hint: "Después alerta y notificación",
			cutoff: "Corte de seguridad",
			cutoff_hint: "Parada forzada si la válvula sigue abierta",
			cycles: "Ciclos",
			today_total: "{min} min hoy",
			no_cycle: "Aún no hay ciclos: esta zona solo riega bajo demanda.",
			cycle: "Ciclo {n}",
			every_day: "Todos los días",
			weekdays_only: "Entre semana",
			weekend: "Fin de semana",
			n_days: "{n} días / semana",
			no_day: "Ningún día elegido",
			enable_cycle: "Activar el ciclo {n}",
			delete_cycle: "Eliminar el ciclo {n}",
			start_time: "Hora de inicio del ciclo {n}",
			day_label: "{day}, ciclo {n}",
			decrease: "Reducir {what}",
			increase: "Aumentar {what}",
			duration_of: "la duración del ciclo {n}",
			add_cycle: "Añadir un ciclo",
			rain: "Recibe lluvia",
			rain_source: "Fuente: {name}",
			rain_none: "Aún no hay entidad meteorológica: elija una en los ajustes generales de la integración.",
			today: "Hoy",
			rain_detail: "{past} mm caídos · {forecast} mm previstos",
			skip: "Omitir el ciclo si la lluvia prevista alcanza",
			skip_hint: "Lluvia prevista en las próximas 24 horas",
			past: "Lluvia caída tenida en cuenta",
			past_hint: "En las últimas horas",
			heat: "Regar más los días calurosos",
			heat_hint: "Duración alargada este porcentaje · 0 % = duración normal",
			heat_threshold: "Día caluroso a partir de",
			heat_threshold_hint: "Temperatura máxima prevista durante el día",
			heat_summary: "Si se prevé que el día alcance {t} °C o más, la duración se alarga un {pct} %.",
			save: "Guardar",
			saving: "Guardando…",
			create: "Crear y añadir ciclos",
			create_hint: "Los ciclos se configuran en el siguiente paso.",
			delete: "Eliminar esta zona",
			delete_confirm: "¿Eliminar la zona {zone}? Se borrarán sus ciclos y entidades.",
			errors: {
				name: "Introduzca un nombre.",
				switch: "Elija el interruptor de la válvula.",
				no_day: "Cada ciclo necesita al menos un día.",
				duration_exceeds_max: "Un ciclo dura más que el corte de seguridad.",
				generic: "No se pudo guardar: {message}"
			},
			rain_choice: "Lluvia",
			receives_rain: "Recibe lluvia",
			receives_rain_desc: "Duraciones ajustadas a la lluvia",
			no_rain: "Protegida de la lluvia",
			no_rain_desc: "Invernadero, zona cubierta: se ignora la lluvia",
			weather_title: "Meteorología",
			rain_hint: "Duración ajustada a la lluvia caída y prevista",
			no_rain_detail: "Lluvia ignorada: solo el calor puede cambiar la duración",
			cutoff_warning: "Este ciclo se detendrá a los {cutoff} min por el corte de seguridad. Para que dure {min} min, aumente el corte de seguridad.",
			raise_cutoff: "Poner el corte en {min} min",
			frost: "Aviso de helada",
			frost_hint: "Desactívelo para una zona protegida de la helada (invernadero calefactado)"
		},
		days: {
			short: [
				"L",
				"M",
				"X",
				"J",
				"V",
				"S",
				"D"
			],
			long: [
				"Lunes",
				"Martes",
				"Miércoles",
				"Jueves",
				"Viernes",
				"Sábado",
				"Domingo"
			]
		},
		card_editor: {
			title: "Título",
			compact: "Vista compacta",
			zones: "Zonas mostradas (todas si está vacío)"
		},
		settings_screen: {
			weather: "Meteorología",
			weather_entity: "Entidad meteorológica",
			weather_hint: "Sirve para adaptar el riego a la lluvia y al calor. Las previsiones horarias dan los mejores resultados.",
			rain_sensor: "Pluviómetro (opcional)",
			rain_hint: "Acumulativo, en mm. Sin él, la lluvia caída se estima a partir de la previsión.",
			none: "Ninguno",
			order: "Orden de riego",
			sequential: "Una zona a la vez",
			sequential_desc: "Las demás esperan su turno",
			parallel: "Zonas en paralelo",
			parallel_desc: "Cada zona empieza a su hora",
			pause: "Pausa",
			pause_off: "El riego está activo. Pausar durante:",
			pause_day: "1 día",
			pause_days: "{n} días",
			pause_until_resumed: "Hasta reanudar",
			alerts: "Avisos",
			alerts_hint: "Teléfonos avisados con prioridad alta si una válvula sigue abierta pese a los reintentos.",
			no_phone: "No se encontró ningún teléfono con la app Home Assistant.",
			test: "Enviar una notificación de prueba",
			test_sent: "Notificación de prueba enviada.",
			test_failed: "No se pudo enviar a: {names}",
			advanced: "Ajustes avanzados de la integración",
			external: "Válvula encendida fuera de hydraXoo",
			external_close: "Cerrarla al instante",
			external_close_desc: "Tratado como fallo y avisado",
			external_allow: "Dejarla abierta",
			external_allow_desc: "La cierra el corte de seguridad",
			frost: "Helada",
			frost_hint: "Avisa a los teléfonos elegidos cuando se prevé helada y hay ciclos programados.",
			frost_no_weather: "Necesita una entidad meteorológica.",
			frost_alert: "Aviso de helada",
			frost_alert_hint: "Un aviso y luego un solo recordatorio unas 3 h antes de la helada si nadie confirmó.",
			frost_threshold: "Umbral de helada",
			frost_threshold_hint: "Temperatura mínima prevista en 24 h",
			frost_thaw: "Aviso de fin de helada",
			frost_thaw_hint: "Avisar también cuando termine la helada"
		},
		unexpected: {
			title: "{zone}: apertura no ordenada a las {time}",
			detail: "La válvula se encendió fuera de hydraXoo y se ha cerrado."
		},
		frost: {
			title: "Helada prevista: {temp} hacia las {time}",
			detail: "Acuérdese de cortar los circuitos de agua exteriores.",
			done: "Hecho",
			pause: "Pausar el riego",
			confirmed: "Circuitos exteriores indicados como cortados"
		}
	},
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
			},
			external: "Ouverte hors hydraXoo · fermeture dans {left}",
			capped: "Limité à {cutoff} min par la coupure de sécurité"
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
			heat_hint: "Durée allongée de ce pourcentage · 0 % = durée normale",
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
			no_rain_detail: "Pluie ignorée : seule la chaleur peut changer la durée",
			cutoff_warning: "Ce cycle sera arrêté au bout de {cutoff} min par la coupure de sécurité. Pour qu'il dure {min} min, augmentez la coupure de sécurité.",
			raise_cutoff: "Passer la coupure à {min} min",
			frost: "Alerte gel",
			frost_hint: "Désactivez-la pour une zone protégée du gel (serre chauffée)"
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
		},
		settings_screen: {
			weather: "Météo",
			weather_entity: "Entité météo",
			weather_hint: "Sert à adapter l'arrosage à la pluie et à la chaleur. Les prévisions horaires donnent les meilleurs résultats.",
			rain_sensor: "Pluviomètre (facultatif)",
			rain_hint: "Cumulatif, en mm. Sans lui, la pluie tombée est estimée à partir des prévisions.",
			none: "Aucun",
			order: "Enchaînement des zones",
			sequential: "Une zone à la fois",
			sequential_desc: "Les autres attendent leur tour",
			parallel: "Zones en parallèle",
			parallel_desc: "Chaque zone démarre à son heure",
			pause: "Pause",
			pause_off: "L'arrosage est actif. Mettre en pause pendant :",
			pause_day: "1 jour",
			pause_days: "{n} jours",
			pause_until_resumed: "Jusqu'à la reprise",
			alerts: "Alertes",
			alerts_hint: "Téléphones prévenus en priorité haute si une vanne ne se referme pas malgré les relances.",
			no_phone: "Aucun téléphone avec l'application Home Assistant n'a été trouvé.",
			test: "Envoyer une notification de test",
			test_sent: "Notification de test envoyée.",
			test_failed: "Envoi impossible vers : {names}",
			advanced: "Réglages avancés de l'intégration",
			external: "Vanne allumée hors hydraXoo",
			external_close: "La refermer immédiatement",
			external_close_desc: "Traité comme un défaut et signalé",
			external_allow: "La laisser ouverte",
			external_allow_desc: "Refermée par la coupure de sécurité",
			frost: "Gel",
			frost_hint: "Prévient les téléphones choisis quand du gel est prévu alors que des cycles sont programmés.",
			frost_no_weather: "Nécessite une entité météo.",
			frost_alert: "Alerte gel",
			frost_alert_hint: "Une alerte, puis un seul rappel environ 3 h avant le gel si personne n'a confirmé.",
			frost_threshold: "Seuil de gel",
			frost_threshold_hint: "Température minimale prévue sur 24 h",
			frost_thaw: "Message de fin de gel",
			frost_thaw_hint: "Prévenir aussi quand le gel est terminé"
		},
		unexpected: {
			title: "{zone} : ouverture non commandée à {time}",
			detail: "La vanne a été allumée en dehors de hydraXoo et a été refermée."
		},
		frost: {
			title: "Gel prévu : {temp} vers {time}",
			detail: "Pensez à couper les circuits d'eau extérieurs.",
			done: "C'est fait",
			pause: "Mettre l'arrosage en pause",
			confirmed: "Circuits extérieurs signalés coupés"
		}
	},
	it: {
		title: "Irrigazione",
		loading: "Caricamento…",
		not_loaded: "hydraXoo non è caricato. Aggiungi l'integrazione in Impostazioni › Dispositivi e servizi.",
		settings: "Impostazioni generali",
		weather: {
			rain: "Pioggia: {past} mm caduti, {forecast} mm previsti",
			rain_forecast: "Pioggia: {forecast} mm previsti",
			adjusted: "Durate adattate automaticamente",
			skipped: "Pioggia sufficiente prevista: cicli saltati per le zone che ricevono pioggia",
			of_durations: "delle durate",
			unavailable: "Meteo non disponibile",
			unavailable_detail: "Le zone irrigano la durata completa",
			no_data: "Il fornitore meteo non fornisce quantità di pioggia",
			heat: "Bonus caldo +{bonus} % ({temp} °C)"
		},
		pause: {
			paused: "Irrigazione in pausa",
			until: "Fino a {date}",
			indefinite: "Fino alla ripresa",
			resume: "Riprendi",
			pause: "Metti in pausa"
		},
		safety: {
			confirmed: "{zone} · chiusura verificata alle {time}",
			confirmed_detail: "La valvola si è chiusa normalmente",
			retried: "{zone} · chiusura verificata alle {time}",
			retried_detail_one: "Consumo residuo rilevato: chiusa dopo {n} tentativo di {s} s",
			retried_detail_other: "Consumo residuo rilevato: chiusa dopo {n} tentativi di {s} s",
			failed: "{zone}: valvola non chiusa",
			failed_detail: "Ancora {power} W dopo {n} tentativi. Questa zona non irriga più.",
			acknowledge: "Conferma",
			unavailable: "{zone} · chiusura non verificata",
			unavailable_detail: "Sensore di consumo non disponibile alle {time}"
		},
		timeline: {
			title: "Oggi",
			total: "{min} min di irrigazione",
			running: "In corso",
			done: "Fatto",
			skipped: "Saltato",
			upcoming: "In programma",
			disabled: "Disattivato",
			now: "Ora",
			label: "{zone}: {count} cicli oggi"
		},
		zone: {
			rain: "Riceve la pioggia · durata adattata",
			no_rain: "Al riparo dalla pioggia",
			heat: " · bonus caldo",
			enable: "Attiva la zona {zone}",
			next: "Prossima: {time} · {min} min",
			next_day: "Prossima: {day} {time} · {min} min",
			next_skipped: "Prossima: {time} · saltata (pioggia)",
			next_day_skipped: "Prossima: {day} {time} · saltata (pioggia)",
			nothing: "Nessun ciclo programmato",
			weather: "Meteo: {pct} % della durata",
			weather_skip: "Pioggia: irrigazione saltata",
			running: "Irrigazione · mancano {left}",
			queued: "In attesa del suo turno",
			checking: "Controllo della chiusura…",
			fault: "Guasto di chiusura",
			disabled: "Zona disattivata",
			no_cycle_today: "Nessun ciclo oggi",
			water_now: "Irriga ora",
			stop: "Ferma",
			edit: "Modifica",
			start: "Avvia",
			cancel: "Annulla",
			duration: "Durata",
			status: {
				done: "Fatto",
				running: "Ora",
				disabled: "Disattivato",
				missed: "Non eseguito",
				in_min: "tra {m} min",
				in_h: "tra {h} h",
				tonight: "stasera"
			},
			skip: {
				weather: "Saltato · pioggia",
				paused: "Saltato · pausa",
				zone_disabled: "Saltato · zona disattivata",
				fault: "Saltato · guasto",
				stopped: "Saltato · fermato"
			},
			external: "Aperta fuori da hydraXoo · si chiude tra {left}",
			capped: "Limitato a {cutoff} min dallo spegnimento di sicurezza"
		},
		new_zone: "Nuova zona",
		editor: {
			subtitle: "Impostazioni della zona",
			back: "Torna al pannello",
			cancel: "Annulla e torna indietro",
			general: "Zona",
			name: "Nome",
			name_placeholder: "Es.: Aiuola di rose",
			icon: "Icona",
			icons: {
				plant: "Pianta",
				tree: "Albero",
				lawn: "Prato",
				flower: "Fiori",
				drop: "Goccia"
			},
			hardware: "Hardware",
			valve: "Elettrovalvola",
			switch: "Interruttore della valvola · obbligatorio",
			switch_choose: "Scegli un'entità switch…",
			power: "Sensore di consumo · consigliato",
			power_choose: "Scegli un sensore di consumo (W)…",
			power_hint: "Il sensore controlla che la valvola sia davvero chiusa.",
			online: "In linea",
			offline: "Non disponibile",
			check: "Controlla la chiusura",
			threshold: "Valvola considerata aperta oltre",
			threshold_hint: "Misura dopo la chiusura",
			delay: "Ritardo di controllo",
			delay_hint: "Dopo il comando di chiusura",
			pulse: "Tentativo",
			pulse_hint: "Apri e richiudi",
			attempts: "Tentativi massimi",
			attempts_hint: "Poi avviso e notifica",
			cutoff: "Spegnimento di sicurezza",
			cutoff_hint: "Arresto forzato se la valvola resta aperta",
			cycles: "Cicli",
			today_total: "{min} min oggi",
			no_cycle: "Ancora nessun ciclo: questa zona irriga solo su richiesta.",
			cycle: "Ciclo {n}",
			every_day: "Tutti i giorni",
			weekdays_only: "Giorni feriali",
			weekend: "Fine settimana",
			n_days: "{n} giorni / settimana",
			no_day: "Nessun giorno scelto",
			enable_cycle: "Attiva il ciclo {n}",
			delete_cycle: "Elimina il ciclo {n}",
			start_time: "Ora di inizio del ciclo {n}",
			day_label: "{day}, ciclo {n}",
			decrease: "Diminuisci {what}",
			increase: "Aumenta {what}",
			duration_of: "la durata del ciclo {n}",
			add_cycle: "Aggiungi un ciclo",
			rain: "Riceve la pioggia",
			rain_source: "Fonte: {name}",
			rain_none: "Ancora nessuna entità meteo: scegline una nelle impostazioni generali dell'integrazione.",
			today: "Oggi",
			rain_detail: "{past} mm caduti · {forecast} mm previsti",
			skip: "Salta il ciclo se la pioggia prevista raggiunge",
			skip_hint: "Pioggia prevista nelle prossime 24 ore",
			past: "Pioggia caduta considerata",
			past_hint: "Nelle ultime ore",
			heat: "Irrigare di più nei giorni caldi",
			heat_hint: "Durata allungata di questa percentuale · 0 % = durata normale",
			heat_threshold: "Giorno caldo da",
			heat_threshold_hint: "Temperatura massima prevista durante la giornata",
			heat_summary: "Se la giornata dovrebbe raggiungere {t} °C o più, la durata viene allungata del {pct} %.",
			save: "Salva",
			saving: "Salvataggio…",
			create: "Crea e aggiungi i cicli",
			create_hint: "I cicli si impostano al passo successivo.",
			delete: "Elimina questa zona",
			delete_confirm: "Eliminare la zona {zone}? I suoi cicli e le sue entità verranno rimossi.",
			errors: {
				name: "Inserisci un nome.",
				switch: "Scegli l'interruttore della valvola.",
				no_day: "Ogni ciclo deve avere almeno un giorno.",
				duration_exceeds_max: "Un ciclo dura più dello spegnimento di sicurezza.",
				generic: "Salvataggio impossibile: {message}"
			},
			rain_choice: "Pioggia",
			receives_rain: "Riceve la pioggia",
			receives_rain_desc: "Durate adattate alla pioggia",
			no_rain: "Al riparo dalla pioggia",
			no_rain_desc: "Serra, zona coperta: la pioggia viene ignorata",
			weather_title: "Meteo",
			rain_hint: "Durata adattata alla pioggia caduta e prevista",
			no_rain_detail: "Pioggia ignorata: solo il caldo può cambiare la durata",
			cutoff_warning: "Questo ciclo verrà fermato dopo {cutoff} min dallo spegnimento di sicurezza. Perché duri {min} min, aumentare lo spegnimento di sicurezza.",
			raise_cutoff: "Porta lo spegnimento a {min} min",
			frost: "Avviso gelo",
			frost_hint: "Disattivare per una zona protetta dal gelo (serra riscaldata)"
		},
		days: {
			short: [
				"L",
				"M",
				"M",
				"G",
				"V",
				"S",
				"D"
			],
			long: [
				"Lunedì",
				"Martedì",
				"Mercoledì",
				"Giovedì",
				"Venerdì",
				"Sabato",
				"Domenica"
			]
		},
		card_editor: {
			title: "Titolo",
			compact: "Visualizzazione compatta",
			zones: "Zone mostrate (tutte se vuoto)"
		},
		settings_screen: {
			weather: "Meteo",
			weather_entity: "Entità meteo",
			weather_hint: "Serve ad adattare l'irrigazione a pioggia e caldo. Le previsioni orarie danno i risultati migliori.",
			rain_sensor: "Pluviometro (facoltativo)",
			rain_hint: "Cumulativo, in mm. Senza di esso, la pioggia caduta viene stimata dalla previsione.",
			none: "Nessuno",
			order: "Ordine di irrigazione",
			sequential: "Una zona alla volta",
			sequential_desc: "Le altre aspettano il loro turno",
			parallel: "Zone in parallelo",
			parallel_desc: "Ogni zona parte alla sua ora",
			pause: "Pausa",
			pause_off: "L'irrigazione è attiva. Metti in pausa per:",
			pause_day: "1 giorno",
			pause_days: "{n} giorni",
			pause_until_resumed: "Fino alla ripresa",
			alerts: "Avvisi",
			alerts_hint: "Telefoni avvisati con priorità alta se una valvola resta aperta nonostante i tentativi.",
			no_phone: "Nessun telefono con l'app Home Assistant trovato.",
			test: "Invia una notifica di prova",
			test_sent: "Notifica di prova inviata.",
			test_failed: "Invio impossibile a: {names}",
			advanced: "Impostazioni avanzate dell'integrazione",
			external: "Valvola accesa fuori da hydraXoo",
			external_close: "Chiuderla subito",
			external_close_desc: "Trattato come guasto e segnalato",
			external_allow: "Lasciarla aperta",
			external_allow_desc: "Chiusa dallo spegnimento di sicurezza",
			frost: "Gelo",
			frost_hint: "Avvisa i telefoni scelti quando è previsto gelo e ci sono cicli programmati.",
			frost_no_weather: "Richiede un'entità meteo.",
			frost_alert: "Avviso gelo",
			frost_alert_hint: "Un avviso, poi un solo promemoria circa 3 h prima del gelo se nessuno ha confermato.",
			frost_threshold: "Soglia di gelo",
			frost_threshold_hint: "Temperatura minima prevista nelle 24 h",
			frost_thaw: "Avviso di fine gelo",
			frost_thaw_hint: "Avvisare anche quando il gelo è finito"
		},
		unexpected: {
			title: "{zone}: apertura non comandata alle {time}",
			detail: "La valvola è stata accesa fuori da hydraXoo ed è stata chiusa."
		},
		frost: {
			title: "Gelo previsto: {temp} verso le {time}",
			detail: "Ricordati di chiudere i circuiti d'acqua esterni.",
			done: "Fatto",
			pause: "Metti in pausa l'irrigazione",
			confirmed: "Circuiti esterni segnalati come chiusi"
		}
	}
};
function Ce(e, t) {
	let n = e;
	for (let e of t.split(".")) {
		if (typeof n != "object" || !n || Array.isArray(n)) return;
		n = n[e];
	}
	return typeof n == "string" ? n : void 0;
}
function K(e) {
	return (e?.locale?.language || e?.language || "en").split("-")[0];
}
function q(e) {
	let t = Se[K(e)] ?? G;
	return (e, n) => {
		let r = Ce(t, e) ?? Ce(G, e) ?? e;
		for (let [e, t] of Object.entries(n ?? {})) r = r.replaceAll(`{${e}}`, String(t));
		return r;
	};
}
function we(e) {
	return (Se[K(e)] ?? G).days ?? G.days;
}
function Te(e, t, n, r = {}) {
	return e(`${t}_${n === 1 ? "one" : "other"}`, {
		n,
		...r
	});
}
// src/editor.ts
var Ee = class extends W {
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
		if (!this.hass) return F;
		let e = q(this.hass);
		return N`<ha-form
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
customElements.get("hydraxoo-card-editor") || customElements.define("hydraxoo-card-editor", Ee);
// src/schedule.ts
var De = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun"
];
function J(e, t) {
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
		weekday: De.indexOf(n.weekday),
		minutes: Number(n.hour) * 60 + Number(n.minute),
		dateKey: `${n.year}-${n.month}-${n.day}`
	};
}
function Oe(e) {
	let [t, n] = e.split(":").map(Number);
	return t * 60 + n;
}
function Y(e, t, n, r = !1) {
	let i = typeof e == "string" ? new Date(e) : e;
	return new Intl.DateTimeFormat(n, {
		timeZone: t,
		hour: r ? "numeric" : "2-digit",
		minute: "2-digit",
		hourCycle: r ? "h12" : "h23"
	}).format(i);
}
function ke(e, t, n = !1) {
	if (!n) return e;
	let [r, i] = e.split(":").map(Number);
	return Y(new Date(Date.UTC(1970, 0, 1, r, i)), "UTC", t, !0);
}
function Ae(e, t, n = !1) {
	return n ? new Intl.DateTimeFormat(t, {
		hour: "numeric",
		hourCycle: "h12",
		timeZone: "UTC"
	}).format(new Date(Date.UTC(1970, 0, 1, e % 24))) : `${e} h`;
}
function X(e, t, n) {
	let r = typeof e == "string" ? new Date(e) : e, i = new Intl.DateTimeFormat(n, {
		timeZone: t,
		weekday: "long",
		day: "numeric",
		month: "long"
	}).format(r);
	return i.charAt(0).toUpperCase() + i.slice(1);
}
function je(e) {
	let t = Math.max(0, Math.round(e)), n = Math.floor(t / 3600), r = Math.floor(t % 3600 / 60), i = String(t % 60).padStart(2, "0");
	return n ? `${n}:${String(r).padStart(2, "0")}:${i}` : `${r}:${i}`;
}
function Me(e, t) {
	return e.weather.skip ? 0 : Math.round(t * e.weather.coefficient_pct / 100);
}
function Ne(e, t, n, r, i) {
	return [...e].reverse().find((e) => e.zone_id === t.id && e.cycle_id === n && J(new Date(e.started), i).dateKey === r);
}
function Pe(e, t, n, r) {
	return e.cycles.filter((e) => e.weekdays.includes(t.weekday)).map((i) => {
		let a = Oe(i.start_time), o = i.duration_min, s = Me(e, o), c;
		if (e.running && e.run && e.run.cycle_id === i.id) c = { kind: "running" }, s = e.run.duration_min;
		else if (!i.enabled || !e.enabled) c = { kind: "disabled" };
		else if (a <= t.minutes) {
			let a = Ne(n, e, i.id, t.dateKey, r);
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
		let l = s > e.max_runtime_min && c.kind !== "done";
		return l && (s = e.max_runtime_min), {
			cycle: i,
			start: a,
			base: o,
			adjusted: s,
			status: c,
			capped: l
		};
	}).sort((e, t) => e.start - t.start);
}
function Fe(e) {
	return e.filter((e) => e.status.kind !== "disabled").reduce((e, t) => e + t.adjusted, 0);
}
function Ie(e) {
	let t = [...new Set(e)].sort();
	return t.length === 7 ? { key: "every_day" } : t.join() === "0,1,2,3,4" ? { key: "weekdays_only" } : t.join() === "5,6" ? { key: "weekend" } : t.length === 0 ? { key: "no_day" } : {
		key: "n_days",
		n: t.length
	};
}
// src/locale.ts
function Z(e) {
	return e?.locale?.language || e?.language || "en";
}
function Q(e) {
	let t = e?.locale?.time_format;
	if (t === "12") return !0;
	if (t === "24") return !1;
	let n = t === "system" ? void 0 : Z(e), r = new Intl.DateTimeFormat(n, { hour: "numeric" }).resolvedOptions().hourCycle;
	return r === "h12" || r === "h11";
}
var Le = {
	monday: 0,
	tuesday: 1,
	wednesday: 2,
	thursday: 3,
	friday: 4,
	saturday: 5,
	sunday: 6
};
function Re(e) {
	let t = e?.locale?.first_weekday;
	if (t && t in Le) return Le[t];
	try {
		let t = new Intl.Locale(Z(e)), n = t.getWeekInfo?.() ?? t.weekInfo;
		if (n?.firstDay) return (n.firstDay + 6) % 7;
	} catch {}
	return 0;
}
function ze(e) {
	return e?.config?.unit_system?.temperature === "°F";
}
function Be(e, t) {
	return t == null ? "?" : ze(e) ? `${Math.round(t * 9 / 5 + 32)} °F` : `${Math.round(t)} °C`;
}
function Ve(e) {
	let t = Re(e);
	return Array.from({ length: 7 }, (e, n) => (t + n) % 7);
}
// src/styles.ts
var $ = o`
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
    grid-template-columns: minmax(64px, auto) 1fr auto;
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
    min-width: 56px;
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
    padding: 0 10px;
    font-size: 18px;
    font-weight: 600;
  }
  .check-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    font-size: 15px;
    cursor: pointer;
  }
  .check-row input {
    width: 22px;
    height: 22px;
    accent-color: var(--hx-primary);
    margin: 0;
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
  /* Time and duration wrap onto two lines on narrow screens */
  .cycle-card .row {
    flex-wrap: wrap;
  }
  .cycle-card.off {
    opacity: 0.6;
  }
  .tile.frost {
    outline: 2px solid var(--hx-warning);
    outline-offset: -2px;
  }
  .warning-box {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--hx-warning-soft);
    color: var(--hx-text);
    font-size: 13px;
    --mdc-icon-size: 20px;
  }
  .warning-box ha-icon,
  ha-icon.capped {
    color: var(--hx-warning);
    flex-shrink: 0;
  }
  ha-icon.capped {
    --mdc-icon-size: 16px;
  }
  .link-button {
    align-self: flex-start;
    min-height: 44px;
    padding: 0;
    border: none;
    background: none;
    color: var(--hx-primary);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
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
`, He = class extends W {
	constructor(...e) {
		super(...e), this.state = null, this._draft = null, this._message = "", this._error = "", this._saving = !1, this._test = async () => {
			let e = this._t, t = await this._call({
				type: "hydraxoo/notify/test",
				services: this._draft.notify_services
			});
			if (!t) return;
			let n = (e) => this.state.settings.notify_options.find((t) => t.value === e)?.label ?? e;
			this._message = t.failed.length ? e("settings_screen.test_failed", { names: t.failed.map(n).join(", ") }) : e("settings_screen.test_sent");
		};
	}
	static {
		this.properties = {
			hass: { attribute: !1 },
			state: { attribute: !1 },
			_draft: { state: !0 },
			_message: { state: !0 },
			_error: { state: !0 },
			_saving: { state: !0 }
		};
	}
	static {
		this.styles = $;
	}
	willUpdate() {
		if (!this._draft && this.state) {
			let e = this.state.settings;
			this._draft = {
				weather_entity: e.weather_entity,
				rain_sensor: e.rain_sensor,
				sequential: e.sequential,
				notify_services: [...e.notify_services],
				external_open: e.external_open ?? "close",
				frost_alert: e.frost_alert ?? !0,
				frost_threshold_c: e.frost_threshold_c ?? 2,
				frost_thaw_notice: e.frost_thaw_notice ?? !1
			};
		}
	}
	get _t() {
		return q(this.hass);
	}
	_set(e) {
		this._draft = {
			...this._draft,
			...e
		}, this._message = "";
	}
	_picker(e, t, n, r, i) {
		if (customElements.get("ha-selector")) return N`<ha-selector
        .hass=${this.hass}
        .selector=${{ entity: { filter: t } }}
        .value=${e ?? ""}
        .label=${n}
        @value-changed=${(e) => i(e.detail.value || null)}
      ></ha-selector>`;
		let a = Object.values(this.hass.states).filter((e) => e.entity_id.startsWith(`${t.domain}.`) && (!t.device_class || e.attributes.device_class === t.device_class)).sort((e, t) => e.entity_id.localeCompare(t.entity_id));
		return N`<label class="field">
      ${n}
      <select @change=${(e) => i(e.target.value || null)}>
        <option value="" ?selected=${!e}>${r}</option>
        ${a.map((t) => N`<option value=${t.entity_id} ?selected=${t.entity_id === e}>
            ${t.attributes.friendly_name ?? t.entity_id}
          </option>`)}
      </select>
    </label>`;
	}
	_weather() {
		let e = this._t, t = this._draft;
		return N`<section class="tile" aria-labelledby="hx-s-weather">
      <h2 id="hx-s-weather">${e("settings_screen.weather")}</h2>
      ${this._picker(t.weather_entity, { domain: "weather" }, e("settings_screen.weather_entity"), e("settings_screen.none"), (e) => this._set({ weather_entity: e }))}
      <span class="tiny">${e("settings_screen.weather_hint")}</span>
      ${this._picker(t.rain_sensor, {
			domain: "sensor",
			device_class: "precipitation"
		}, e("settings_screen.rain_sensor"), e("settings_screen.none"), (e) => this._set({ rain_sensor: e }))}
      <span class="tiny">${e("settings_screen.rain_hint")}</span>
    </section>`;
	}
	_order() {
		let e = this._t, t = this._draft;
		return N`<section class="tile" aria-labelledby="hx-s-order">
      <h2 id="hx-s-order">${e("settings_screen.order")}</h2>
      <div class="choice-grid" role="group" aria-labelledby="hx-s-order">
        ${[!0, !1].map((n) => N`<button
            type="button"
            class="choice"
            aria-pressed=${t.sequential === n ? "true" : "false"}
            @click=${() => this._set({ sequential: n })}
          >
            <span class="strong">${e(n ? "settings_screen.sequential" : "settings_screen.parallel")}</span>
            <span class="tiny">${e(n ? "settings_screen.sequential_desc" : "settings_screen.parallel_desc")}</span>
          </button>`)}
      </div>
    </section>`;
	}
	_pause() {
		let e = this._t, t = this.state.settings, n = this.hass.config.time_zone, r = Z(this.hass);
		return N`<section class="tile" aria-labelledby="hx-s-pause">
      <h2 id="hx-s-pause">${e("settings_screen.pause")}</h2>
      ${t.paused ? N`<div class="row">
            <span class="stack grow">
              <span class="strong">${e("pause.paused")}</span>
              <span class="small">${t.pause_until ? e("pause.until", { date: `${X(t.pause_until, n, r)} ${Y(t.pause_until, n, r, Q(this.hass))}` }) : e("pause.indefinite")}</span>
            </span>
            <button type="button" class="btn" @click=${() => this._call({ type: "hydraxoo/resume" })}>
              ${e("pause.resume")}
            </button>
          </div>` : N`<span class="small">${e("settings_screen.pause_off")}</span>
            <div class="actions">
              ${[
			1,
			3,
			7
		].map((t) => N`<button
                  type="button"
                  class="btn"
                  @click=${() => this._call({
			type: "hydraxoo/pause",
			days: t
		})}
                >${e(t === 1 ? "settings_screen.pause_day" : "settings_screen.pause_days", { n: t })}</button>`)}
              <button type="button" class="btn" @click=${() => this._call({ type: "hydraxoo/pause" })}>
                ${e("settings_screen.pause_until_resumed")}
              </button>
            </div>`}
    </section>`;
	}
	_toggle(e, t, n, r) {
		return N`<div class="setting">
      <span class="stack"><span class="strong">${t}</span><span class="tiny">${n}</span></span>
      <button
        type="button"
        class="switch"
        role="switch"
        aria-checked=${e ? "true" : "false"}
        aria-label=${t}
        @click=${() => r(!e)}
      ></button>
    </div>`;
	}
	_frost() {
		let e = this._t, t = this._draft, n = ze(this.hass), r = n ? Math.round(t.frost_threshold_c * 9 / 5 + 32) : t.frost_threshold_c, i = (e) => {
			let t = n ? Math.round((e - 32) * 5 / 9 * 10) / 10 : e;
			this._set({ frost_threshold_c: Math.min(10, Math.max(-5, t)) });
		}, a = n ? 1 : .5, o = n ? "°F" : "°C", s = !!this.state.settings.weather_entity;
		return N`<section class="tile" aria-labelledby="hx-s-frost">
      <h2 id="hx-s-frost">${e("settings_screen.frost")}</h2>
      <span class="tiny">${e(s ? "settings_screen.frost_hint" : "settings_screen.frost_no_weather")}</span>
      <div>
        ${this._toggle(t.frost_alert, e("settings_screen.frost_alert"), e("settings_screen.frost_alert_hint"), (e) => this._set({ frost_alert: e }))}
        ${t.frost_alert ? N`<div class="setting">
              <span class="stack">
                <span class="strong">${e("settings_screen.frost_threshold")}</span>
                <span class="tiny">${e("settings_screen.frost_threshold_hint")}</span>
              </span>
              <span class="stepper">
                <button type="button" aria-label=${e("editor.decrease", { what: e("settings_screen.frost_threshold") })}
                  @click=${() => i(r - a)}>−</button>
                <span class="value" aria-live="polite">${r.toLocaleString(Z(this.hass))} ${o}</span>
                <button type="button" aria-label=${e("editor.increase", { what: e("settings_screen.frost_threshold") })}
                  @click=${() => i(r + a)}>+</button>
              </span>
            </div>
            ${this._toggle(t.frost_thaw_notice, e("settings_screen.frost_thaw"), e("settings_screen.frost_thaw_hint"), (e) => this._set({ frost_thaw_notice: e }))}` : F}
      </div>
    </section>`;
	}
	_safety() {
		let e = this._t, t = this._draft;
		return N`<section class="tile" aria-labelledby="hx-s-safety">
      <h2 id="hx-s-safety">${e("settings_screen.external")}</h2>
      <div class="choice-grid" role="group" aria-labelledby="hx-s-safety">
        ${["close", "allow"].map((n) => N`<button
            type="button"
            class="choice"
            aria-pressed=${t.external_open === n ? "true" : "false"}
            @click=${() => this._set({ external_open: n })}
          >
            <span class="strong">${e(`settings_screen.external_${n}`)}</span>
            <span class="tiny">${e(`settings_screen.external_${n}_desc`)}</span>
          </button>`)}
      </div>
    </section>`;
	}
	_alerts() {
		let e = this._t, t = this._draft, n = this.state.settings.notify_options;
		return N`<section class="tile" aria-labelledby="hx-s-alerts">
      <h2 id="hx-s-alerts">${e("settings_screen.alerts")}</h2>
      <span class="tiny">${e("settings_screen.alerts_hint")}</span>
      ${n.length ? N`<div class="stack" role="group" aria-labelledby="hx-s-alerts">
            ${n.map((e) => {
			let n = t.notify_services.includes(e.value);
			return N`<label class="check-row">
                <input
                  type="checkbox"
                  .checked=${n}
                  @change=${() => this._set({ notify_services: n ? t.notify_services.filter((t) => t !== e.value) : [...t.notify_services, e.value] })}
                />
                <span>${e.label}</span>
              </label>`;
		})}
          </div>` : N`<span class="small">${e("settings_screen.no_phone")}</span>`}
      <button
        type="button"
        class="btn"
        ?disabled=${!t.notify_services.length}
        @click=${this._test}
      ><ha-icon icon="mdi:bell-ring-outline"></ha-icon>${e("settings_screen.test")}</button>
    </section>`;
	}
	async _call(e) {
		try {
			return this._error = "", await this.hass.callWS(e);
		} catch (e) {
			this._error = Ue(this._t, e);
			return;
		}
	}
	async _save() {
		this._saving = !0;
		let e = await this._call({
			type: "hydraxoo/settings/save",
			...this._draft
		});
		this._saving = !1, e === void 0 && this._error || this.dispatchEvent(new CustomEvent("close", {
			bubbles: !0,
			composed: !0
		}));
	}
	_close() {
		this.dispatchEvent(new CustomEvent("close", {
			bubbles: !0,
			composed: !0
		}));
	}
	_advanced() {
		history.pushState(null, "", "/config/integrations/integration/hydraxoo"), window.dispatchEvent(new CustomEvent("location-changed"));
	}
	render() {
		if (!this._draft || !this.state) return F;
		let e = this._t;
		return N`<div style="display:flex;flex-direction:column;gap:14px">
      <div class="header">
        <div class="header-left">
          <button type="button" class="icon-button" aria-label=${e("editor.back")} @click=${this._close}>
            <ha-icon icon="mdi:arrow-left"></ha-icon>
          </button>
          <h1>${e("settings")}</h1>
        </div>
      </div>
      ${this._weather()} ${this._order()} ${this._pause()} ${this._safety()} ${this._alerts()} ${this._frost()}
      ${this._message ? N`<div class="small" role="status">${this._message}</div>` : F}
      ${this._error ? N`<div class="error-text" role="alert">${this._error}</div>` : F}
      <button type="button" class="btn primary" ?disabled=${this._saving} @click=${this._save}>
        ${this._saving ? e("editor.saving") : e("editor.save")}
      </button>
      <button type="button" class="btn" @click=${this._advanced}>${e("settings_screen.advanced")}</button>
    </div>`;
	}
};
function Ue(e, t) {
	return e("editor.errors.generic", { message: t?.message ?? String(t) });
}
customElements.get("hydraxoo-settings-form") || customElements.define("hydraxoo-settings-form", He);
// src/types.ts
var We = {
	threshold_w: 1,
	check_delay_s: 10,
	retry_pulse_s: 5,
	max_attempts: 5
}, Ge = {
	skip_mm: 5,
	past_window_h: 48,
	forecast_window_h: 24,
	heat_threshold_c: 30,
	heat_bonus_pct: 0,
	min_pct: 0,
	max_pct: 150
}, Ke = [
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
function qe(e) {
	return JSON.parse(JSON.stringify(e));
}
function Je() {
	return {
		name: "",
		icon: Ke[0].icon,
		enabled: !0,
		switch_entity: "",
		power_entity: null,
		max_runtime_min: 5,
		receives_rain: !0,
		frost_alert: !0,
		safety: { ...We },
		weather_rules: { ...Ge },
		cycles: []
	};
}
var Ye = class extends W {
	constructor(...e) {
		super(...e), this.zone = null, this.state = null, this._draft = Je(), this._error = "", this._saving = !1, this._loadedFor = void 0, this._addCycle = () => {
			let e = this._draft.cycles.at(-1), t = {
				enabled: !0,
				start_time: e ? e.start_time : "06:00",
				duration_min: Math.min(5, this._draft.max_runtime_min),
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
		this.styles = $;
	}
	willUpdate() {
		let e = this.zone?.id ?? null;
		e !== this._loadedFor && (this._loadedFor = e, this._draft = this.zone ? qe(this._configOf(this.zone)) : Je(), this._error = "");
	}
	_configOf(e) {
		let { id: t, name: n, icon: r, enabled: i, switch_entity: a, power_entity: o, max_runtime_min: s, receives_rain: c, frost_alert: l, safety: u, weather_rules: d, cycles: f } = e;
		return {
			id: t,
			name: n,
			icon: r,
			enabled: i,
			switch_entity: a,
			power_entity: o,
			max_runtime_min: s,
			receives_rain: c,
			frost_alert: l ?? !0,
			safety: u,
			weather_rules: d,
			cycles: f
		};
	}
	get _t() {
		return q(this.hass);
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
		return N`<span class="stepper">
      <button
        type="button"
        aria-label=${r("editor.decrease", { what: t.what })}
        ?disabled=${e <= t.min}
        @click=${() => c(e - a)}
      >−</button>
      <span class="value" aria-live="polite"
        >${t.signed && e > 0 ? "+" : ""}${e.toLocaleString(K(this.hass))} ${t.unit}</span
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
		return N`<button
      type="button"
      class="switch"
      role="switch"
      aria-checked=${e ? "true" : "false"}
      aria-label=${t}
      @click=${() => n(!e)}
    ></button>`;
	}
	_entityPicker(e, t, n, r, i) {
		if (customElements.get("ha-selector")) return N`<ha-selector
        .hass=${this.hass}
        .selector=${{ entity: { filter: t } }}
        .value=${e ?? ""}
        .label=${n}
        @value-changed=${(e) => i(e.detail.value || null)}
      ></ha-selector>`;
		let a = Object.values(this.hass.states).filter((e) => e.entity_id.startsWith(`${t.domain}.`) && (!t.device_class || e.attributes.device_class === t.device_class)).sort((e, t) => e.entity_id.localeCompare(t.entity_id));
		return N`<label class="field">
      ${n}
      <select @change=${(e) => i(e.target.value || null)}>
        <option value="" ?selected=${!e}>${r}</option>
        ${a.map((t) => N`<option value=${t.entity_id} ?selected=${t.entity_id === e}>
            ${t.attributes.friendly_name ?? t.entity_id} (${t.entity_id})
          </option>`)}
      </select>
    </label>`;
	}
	_general(e) {
		let t = this._t, n = this._draft;
		return N`<section class="tile" aria-labelledby="hx-general">
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
          ${Ke.map((e) => N`<button
              type="button"
              class="choice"
              aria-pressed=${n.icon === e.icon ? "true" : "false"}
              aria-label=${t(`editor.icons.${e.key}`)}
              @click=${() => this._set({ icon: e.icon })}
            ><ha-icon .icon=${e.icon}></ha-icon></button>`)}
        </div>
      </div>
      ${e ? N`<div class="stack" role="group" aria-label=${t("editor.rain_choice")}>
            <span class="small strong">${t("editor.rain_choice")}</span>
            <div class="choice-grid">
              ${[!0, !1].map((e) => N`<button
                  type="button"
                  class="choice"
                  aria-pressed=${n.receives_rain === e ? "true" : "false"}
                  @click=${() => this._set({ receives_rain: e })}
                >
                  <span class="strong">${t(e ? "editor.receives_rain" : "editor.no_rain")}</span>
                  <span class="tiny">${t(e ? "editor.receives_rain_desc" : "editor.no_rain_desc")}</span>
                </button>`)}
            </div>
          </div>` : F}
    </section>`;
	}
	_hardware(e) {
		let t = this._t, n = this._draft, r = n.switch_entity ? this.hass.states[n.switch_entity] : void 0, i = r && r.state !== "unavailable", a = n.power_entity !== null, o = n.safety;
		return N`<section class="tile" aria-labelledby="hx-hw">
      <h3 id="hx-hw">${t(e ? "editor.valve" : "editor.hardware")}</h3>
      ${this._entityPicker(n.switch_entity || null, { domain: "switch" }, t("editor.switch"), t("editor.switch_choose"), (e) => this._set({ switch_entity: e ?? "" }))}
      ${n.switch_entity ? N`<span class="chip ${i ? "success" : "error"}"
            >${t(i ? "editor.online" : "editor.offline")}</span
          >` : F}
      ${e ? N`<div class="row">
            <span class="grow strong">${t("editor.check")}</span>
            ${this._switch(a, t("editor.check"), (e) => this._set({ power_entity: e ? n.power_entity ?? "" : null }))}
          </div>` : F}
      ${!e || a ? this._entityPicker(n.power_entity || null, {
			domain: "sensor",
			device_class: "power"
		}, t("editor.power"), t("editor.power_choose"), (t) => this._set({ power_entity: t ?? (e ? "" : null) })) : F}
      <span class="tiny">${t("editor.power_hint")}</span>
      ${e && a ? N`<div>
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
          </div>` : F}
      ${e ? this._setting(t("editor.cutoff"), t("editor.cutoff_hint"), this._stepper(n.max_runtime_min, {
			min: 1,
			max: 240,
			unit: "min",
			what: t("editor.cutoff")
		}, (e) => this._set({ max_runtime_min: e }))) : F}
    </section>`;
	}
	_setting(e, t, n) {
		return N`<div class="setting">
      <span class="stack"><span class="strong">${e}</span><span class="tiny">${t}</span></span>
      ${n}
    </div>`;
	}
	_cycles() {
		let e = this._t, t = we(this.hass), n = this._draft.cycles;
		return N`<section class="tile" aria-labelledby="hx-cycles">
      <div class="row">
        <h2 id="hx-cycles" class="grow">${e("editor.cycles")}</h2>
      </div>
      ${n.length === 0 ? N`<span class="small">${e("editor.no_cycle")}</span>` : F}
      ${n.map((r, i) => {
			let a = i + 1, o = Ie(r.weekdays);
			return N`<div class="cycle-card ${r.enabled ? "" : "off"}">
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
				max: 240,
				unit: "min",
				what: e("editor.duration_of", { n: a })
			}, (e) => this._setCycle(i, { duration_min: e }))}
          </div>
          ${r.duration_min > this._draft.max_runtime_min ? N`<div class="warning-box" role="status">
                <ha-icon icon="mdi:alert-outline"></ha-icon>
                <span class="stack grow">
                  <span>${e("editor.cutoff_warning", {
				cutoff: this._draft.max_runtime_min,
				min: r.duration_min
			})}</span>
                  <button
                    type="button"
                    class="link-button"
                    @click=${() => this._set({ max_runtime_min: r.duration_min })}
                  >${e("editor.raise_cutoff", { min: r.duration_min })}</button>
                </span>
              </div>` : F}
          <div class="days">
            ${Ve(this.hass).map((n) => {
				let o = t.short[n];
				return N`<button
                type="button"
                class="choice"
                aria-pressed=${r.weekdays.includes(n) ? "true" : "false"}
                aria-label=${e("editor.day_label", {
					day: t.long[n],
					n: a
				})}
                @click=${() => this._toggleDay(i, n)}
              >${o}</button>`;
			})}
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
		return N`<section class="tile" aria-labelledby="hx-weather">
      <span class="stack">
        <h2 id="hx-weather">${e("editor.weather_title")}</h2>
        <span class="tiny">${i?.weather_entity ? e("editor.rain_source", { name: i.weather_name ?? i.weather_entity }) : e("editor.rain_none")}</span>
      </span>
      ${a && i?.weather_entity ? N`<div class="stack">
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
          </div>` : F}
      <div>
        <div class="setting">
          <span class="stack"
            ><span class="strong">${e("editor.rain")}</span
            ><span class="tiny">${e(n ? "editor.rain_hint" : "editor.no_rain_desc")}</span></span
          >
          ${this._switch(n, e("editor.rain"), (e) => this._set({ receives_rain: e }))}
        </div>
        <div class="setting">
          <span class="stack"
            ><span class="strong">${e("editor.frost")}</span
            ><span class="tiny">${e("editor.frost_hint")}</span></span
          >
          ${this._switch(t.frost_alert, e("editor.frost"), (e) => this._set({ frost_alert: e }))}
        </div>
        ${n ? N`${this._setting(e("editor.skip"), e("editor.skip_hint"), this._stepper(r.skip_mm, {
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
		} })))}` : F}
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
		} }))) : F}
      </div>
      ${r.heat_bonus_pct > 0 ? N`<span class="tiny">${e("editor.heat_summary", {
			t: r.heat_threshold_c.toLocaleString(K(this.hass)),
			pct: r.heat_bonus_pct
		})}</span>` : F}
    </section>`;
	}
	_validate() {
		let e = this._t, t = this._draft;
		return t.name.trim() ? t.switch_entity ? t.cycles.some((e) => e.weekdays.length === 0) ? e("editor.errors.no_day") : "" : e("editor.errors.switch") : e("editor.errors.name");
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
		return N`<div class="form" style="display:flex;flex-direction:column;gap:14px">
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
            ${t ? F : N`<span class="sub">${e("editor.subtitle")}</span>`}
          </div>
        </div>
      </div>
      ${this._general(t)}
      ${this._hardware(!t)}
      ${t ? F : this._cycles()}
      ${t ? F : this._weather()}
      ${this._error ? N`<div class="error-text" role="alert">${this._error}</div>` : F}
      <button type="button" class="btn primary" ?disabled=${this._saving} @click=${this._save}>
        ${this._saving ? e("editor.saving") : e(t ? "editor.create" : "editor.save")}
      </button>
      ${t ? N`<span class="tiny" style="text-align:center">${e("editor.create_hint")}</span>` : N`<button type="button" class="btn danger" @click=${this._delete}>${e("editor.delete")}</button>`}
    </div>`;
	}
};
customElements.get("hydraxoo-zone-form") || customElements.define("hydraxoo-zone-form", Ye);
// src/hydraxoo-card.ts
var Xe = "0.2.1", Ze = class extends W {
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
		this.styles = $;
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
			this._state?.zones.some((e) => e.running || e.external_open) && this.requestUpdate();
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
		return q(this.hass);
	}
	get _tz() {
		return this.hass.config.time_zone;
	}
	get _lang() {
		return Z(this.hass);
	}
	get _h12() {
		return Q(this.hass);
	}
	_time(e) {
		return Y(e, this._tz, this._lang, this._h12);
	}
	get _isAdmin() {
		return this.hass.user?.is_admin ?? !1;
	}
	_zones() {
		let e = this._state?.zones ?? [], t = this._config.zones;
		return t?.length ? e.filter((e) => t.includes(e.id)) : e;
	}
	_openSettings() {
		this._view = { name: "settings" };
	}
	render() {
		if (!this.hass) return F;
		let e = this._t;
		if (this._error === "not_loaded") return N`<ha-card><div class="small">${e("not_loaded")}</div></ha-card>`;
		if (!this._state) return N`<ha-card><div class="small">${e("loading")}</div></ha-card>`;
		let t = this._view;
		if (t.name === "zone") {
			let e = this._state.zones.find((e) => e.id === t.id);
			if (e) return N`<ha-card>
          <hydraxoo-zone-form
            .hass=${this.hass}
            .zone=${e}
            .state=${this._state}
            @close=${() => this._view = { name: "dashboard" }}
            @saved=${() => this._view = { name: "dashboard" }}
          ></hydraxoo-zone-form>
        </ha-card>`;
		}
		return t.name === "settings" ? N`<ha-card>
        <hydraxoo-settings-form
          .hass=${this.hass}
          .state=${this._state}
          @close=${() => this._view = { name: "dashboard" }}
        ></hydraxoo-settings-form>
      </ha-card>` : t.name === "new" ? N`<ha-card>
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
		let e = this._t, t = this._state, n = /* @__PURE__ */ new Date(), r = J(n, this._tz), i = this._zones(), a = !!this._config.compact, o = new Map(i.map((e) => [e.id, Pe(e, r, t.history, this._tz)]));
		return N`<ha-card class=${a ? "compact" : ""}>
      <div class="header">
        <div class="stack">
          <h1>${this._config.title || e("title")}</h1>
          <span class="sub">${X(n, this._tz, this._lang)} · ${this._time(n)}</span>
        </div>
        ${this._isAdmin ? N`<button type="button" class="icon-button" aria-label=${e("settings")} @click=${this._openSettings}>
              <ha-icon icon="mdi:cog-outline"></ha-icon>
            </button>` : F}
      </div>
      ${this._pauseBanner()}
      ${this._weatherBanner()}
      ${this._faultBanners(i)}
      ${this._frostBanner()}
      ${this._unexpectedBanner(i)}
      ${this._safetyBanner()}
      ${a ? F : this._timeline(i, o, r)}
      ${i.map((e) => this._zoneCard(e, o.get(e.id) ?? []))}
      ${this._isAdmin ? N`<button type="button" class="btn ghost-dashed" @click=${() => this._view = { name: "new" }}>
            <ha-icon icon="mdi:plus"></ha-icon>${e("new_zone")}
          </button>` : F}
      ${this._error && this._error !== "not_loaded" ? N`<div class="error-text" role="alert">${this._error}</div>` : F}
    </ha-card>`;
	}
	_pauseBanner() {
		let e = this._t, t = this._state.settings;
		return t.paused ? N`<div class="tile">
      <div class="row">
        <div class="badge-icon warning"><ha-icon icon="mdi:pause"></ha-icon></div>
        <span class="stack grow">
          <span class="strong">${e("pause.paused")}</span>
          <span class="small">${t.pause_until ? e("pause.until", { date: `${X(t.pause_until, this._tz, this._lang)} ${this._time(t.pause_until)}` }) : e("pause.indefinite")}</span>
        </span>
        <button type="button" class="btn" @click=${() => this._call("resume")}>${e("pause.resume")}</button>
      </div>
    </div>` : F;
	}
	_weatherBanner() {
		let e = this._t, t = this._state;
		if (!t.settings.weather_entity) return F;
		let n = t.weather;
		if (n.warnings.includes("weather_unavailable")) return N`<div class="tile"><div class="row">
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
		return N`<div class="tile"><div class="row">
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
		return e.filter((e) => e.fault).map((e) => N`<div class="tile" role="alert"><div class="row">
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
	_frostBanner() {
		let e = this._t, t = this._state.frost;
		if (!t?.active) return F;
		let n = {
			temp: Be(this.hass, t.min_c),
			time: t.frost_at ? this._time(t.frost_at) : "?"
		};
		return t.acknowledged ? N`<div class="tile"><div class="row">
        <div class="badge-icon"><ha-icon icon="mdi:snowflake"></ha-icon></div>
        <span class="stack grow">
          <span class="strong">${e("frost.title", n)}</span>
          <span class="tiny">${e("frost.confirmed")}</span>
        </span>
      </div></div>` : N`<div class="tile frost" role="alert">
      <div class="row">
        <div class="badge-icon warning"><ha-icon icon="mdi:snowflake-alert"></ha-icon></div>
        <span class="stack grow">
          <span class="strong">${e("frost.title", n)}</span>
          <span class="small">${e("frost.detail")}</span>
        </span>
      </div>
      <div class="actions">
        <button type="button" class="btn primary grow" @click=${() => this._call("frost/acknowledge")}>
          <ha-icon icon="mdi:check"></ha-icon>${e("frost.done")}
        </button>
        ${this._state.settings.paused ? F : N`<button
              type="button"
              class="btn grow"
              @click=${async () => {
			await this._call("pause"), await this._call("frost/acknowledge");
		}}
            ><ha-icon icon="mdi:pause"></ha-icon>${e("frost.pause")}</button>`}
      </div>
    </div>`;
	}
	_unexpectedBanner(e) {
		let t = this._t, n = new Set(e.map((e) => e.id)), r = Date.now() - 864e5, i = [...this._state.history].reverse().find((e) => e.kind === "unexpected" && n.has(e.zone_id) && new Date(e.started).getTime() >= r);
		return i ? N`<div class="tile"><div class="row">
      <div class="badge-icon warning"><ha-icon icon="mdi:alert-outline"></ha-icon></div>
      <span class="stack grow">
        <span class="strong">${t("unexpected.title", {
			zone: e.find((e) => e.id === i.zone_id).name,
			time: this._time(i.started)
		})}</span>
        <span class="tiny">${t("unexpected.detail")}</span>
      </span>
    </div></div>` : F;
	}
	_safetyBanner() {
		let e = this._t, t = this._state.last_check;
		if (!t || t.result === "failed") return F;
		let n = this._state.zones.find((e) => e.id === t.zone_id), r = this._time(t.time), i, a, o = "success";
		return t.result === "sensor_unavailable" ? (i = e("safety.unavailable", { zone: t.zone_name }), a = e("safety.unavailable_detail", { time: r }), o = "warning") : t.retries > 0 ? (i = e("safety.retried", {
			zone: t.zone_name,
			time: r
		}), a = Te(e, "safety.retried_detail", t.retries, { s: n?.safety.retry_pulse_s ?? 5 }), o = "warning") : (i = e("safety.confirmed", {
			zone: t.zone_name,
			time: r
		}), a = e("safety.confirmed_detail")), N`<div class="tile"><div class="row">
      <div class="badge-icon ${o}"><ha-icon icon="mdi:shield-check-outline"></ha-icon></div>
      <span class="stack grow">
        <span class="strong">${i}</span>
        <span class="tiny">${a}</span>
      </span>
    </div></div>`;
	}
	_timeline(e, t, n) {
		let r = this._t;
		if (!e.length) return F;
		let i = [...t.values()].reduce((e, t) => e + Fe(t), 0), a = n.minutes / 1440 * 100, o = new Set([...t.values()].flat().map((e) => e.status.kind));
		return N`<section class="tile" aria-labelledby="hx-today">
      <div class="row">
        <h2 id="hx-today" class="grow">${r("timeline.title")}</h2>
        <span class="small">${r("timeline.total", { min: i })}</span>
      </div>
      <div class="timeline">
        ${e.map((e) => {
			let n = t.get(e.id) ?? [];
			return N`<span class="label">${e.name}</span>
            <div class="track" role="img" aria-label=${r("timeline.label", {
				zone: e.name,
				count: n.length
			})}>
              ${n.map((e) => {
				let t = e.start / 1440 * 100, n = Math.max(e.adjusted, e.base) / 1440 * 100;
				return N`<div
                  class="mark ${e.status.kind}"
                  style="left: ${t}%; width: ${n}%"
                  title="${ke(e.cycle.start_time, this._lang, this._h12)} · ${e.status.kind === "skipped" ? r(`zone.skip.${e.status.reason}`) : `${e.adjusted} min`}"
                ></div>`;
			})}
              <div class="now" style="left: ${a}%"></div>
            </div>`;
		})}
        <span></span>
        <div class="hours">
          ${[
			0,
			6,
			12,
			18,
			24
		].map((e) => N`<span>${Ae(e, this._lang, this._h12)}</span>`)}
        </div>
      </div>
      <div class="legend">
        ${o.has("running") ? N`<span><span class="swatch running"></span>${r("timeline.running")}</span>` : F}
        <span><span class="swatch done"></span>${r("timeline.done")}</span>
        ${o.has("skipped") ? N`<span><span class="swatch skipped"></span>${r("timeline.skipped")}</span>` : F}
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
		if (e.fault && n.push(N`<span class="chip error">${t("zone.fault")}</span>`), e.running && n.push(N`<span class="chip success"><ha-icon icon="mdi:water"></ha-icon>${t("zone.running", { left: je(this._remaining(e)) })}</span>`), e.external_open) {
			let r = Math.max(0, (new Date(e.external_open.ends).getTime() - Date.now()) / 1e3);
			n.push(N`<span class="chip warning"><ha-icon icon="mdi:alert-outline"></ha-icon>${t("zone.external", { left: je(r) })}</span>`);
		}
		if (e.queued && n.push(N`<span class="chip warning">${t("zone.queued")}</span>`), e.checking && n.push(N`<span class="chip warning">${t("zone.checking")}</span>`), e.enabled || n.push(N`<span class="chip muted">${t("zone.disabled")}</span>`), e.next_run && !e.running) {
			let r = new Date(e.next_run.time), i = J(r, this._tz).dateKey === J(/* @__PURE__ */ new Date(), this._tz).dateKey, a = this._time(r), o = e.next_run.adjusted_duration_min, s = we(this.hass).long[J(r, this._tz).weekday], c = `zone.${i ? "next" : "next_day"}${o === 0 ? "_skipped" : ""}`;
			n.push(N`<span class="chip ${o === 0 ? "muted" : ""}"><ha-icon icon="mdi:clock-outline"></ha-icon>${t(c, {
				time: a,
				min: o,
				day: s
			})}</span>`);
		} else !e.next_run && e.enabled && !e.running && n.push(N`<span class="chip muted">${t("zone.nothing")}</span>`);
		if (this._state.settings.weather_entity) {
			let r = e.weather;
			r.skip || r.coefficient_pct === 0 ? n.push(N`<span class="chip warning"><ha-icon icon="mdi:weather-rainy"></ha-icon>${t("zone.weather_skip")}</span>`) : r.coefficient_pct !== 100 && n.push(N`<span class="chip warning">${t("zone.weather", { pct: r.coefficient_pct })}</span>`);
		}
		return n;
	}
	_statusLabel(e) {
		let t = this._t, n = e.status;
		switch (n.kind) {
			case "running": return N`<span class="status running">${t("zone.status.running")}</span>`;
			case "done": return N`<span class="status"><ha-icon icon="mdi:check"></ha-icon>${t("zone.status.done")}</span>`;
			case "skipped": return N`<span class="status skipped"><ha-icon icon="mdi:close"></ha-icon>${t(`zone.skip.${n.reason}`)}</span>`;
			case "disabled": return N`<span class="status">${t("zone.status.disabled")}</span>`;
			case "past": return N`<span class="status">—</span>`;
			case "upcoming": {
				let e;
				return e = n.inMinutes < 60 ? t("zone.status.in_min", { m: n.inMinutes }) : n.startMinutes >= 1080 && n.inMinutes >= 180 ? t("zone.status.tonight") : t("zone.status.in_h", { h: Math.round(n.inMinutes / 60) }), N`<span class="status upcoming">${e}</span>`;
			}
		}
	}
	_zoneCard(e, t) {
		let n = this._t, r = e.running || e.queued || !!e.external_open;
		return N`<section class="tile" aria-labelledby="hx-zone-${e.id}">
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
        ${t.length ? t.map((t) => {
			let r = [
				"done",
				"past",
				"disabled",
				"skipped"
			].includes(t.status.kind), i = t.adjusted !== t.base && t.status.kind !== "skipped", a = n("zone.capped", { cutoff: e.max_runtime_min });
			return N`<div class="cycle-row ${r ? "muted" : ""}">
                <span class="time">${ke(t.cycle.start_time, this._lang, this._h12)}</span>
                <span class="dur">
                  ${t.status.kind === "skipped" ? N`<s>${t.base} min</s>` : N`${i ? N`<s>${t.base} min</s>` : F}<b>${i ? t.adjusted : t.base} min</b>${t.capped ? N`<ha-icon
                            class="capped"
                            icon="mdi:alert-outline"
                            role="img"
                            aria-label=${a}
                            title=${a}
                          ></ha-icon>` : F}`}
                </span>
                ${this._statusLabel(t)}
              </div>`;
		}) : N`<div class="cycle-row muted"><span class="small" style="grid-column: 1 / -1">${n("zone.no_cycle_today")}</span></div>`}
      </div>
      ${this._runFor === e.id ? this._runPicker(e) : N`<div class="actions">
        ${r ? N`<button type="button" class="btn grow" @click=${() => this._call("zone/stop", { zone_id: e.id })}>
              <ha-icon icon="mdi:stop"></ha-icon>${n("zone.stop")}
            </button>` : N`<button
              type="button"
              class="btn primary grow"
              ?disabled=${e.fault}
              @click=${() => {
			this._runFor = e.id, this._runMinutes = Math.min(e.cycles.find((e) => e.enabled)?.duration_min ?? 10, e.max_runtime_min);
		}}
            ><ha-icon icon="mdi:play"></ha-icon>${n("zone.water_now")}</button>`}
        ${this._isAdmin ? N`<button type="button" class="btn" @click=${() => this._view = {
			name: "zone",
			id: e.id
		}}>${n("zone.edit")}</button>` : F}
      </div>`}
    </section>`;
	}
	_runPicker(e) {
		let t = this._t, n = (t) => this._runMinutes = Math.min(e.max_runtime_min, Math.max(1, t));
		return N`<div class="row" style="flex-wrap: wrap">
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
customElements.get("hydraxoo-card") || customElements.define("hydraxoo-card", Ze), window.customCards = window.customCards ?? [], window.customCards.some((e) => e.type === "hydraxoo-card") || window.customCards.push({
	type: "hydraxoo-card",
	name: "hydraXoo",
	description: "Zone-based irrigation: schedule, weather and valve safety.",
	preview: !1
}), console.info(`%c hydraXoo card %c ${Xe} `, "background:#1d4ed8;color:#fff", "");
export { Ze as HydraxooCard };
