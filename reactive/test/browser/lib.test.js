import {
	createSignal,
	createMemo,
	createEffect,
	batch,
	getResource
} from '../../src/lib';

const wait = async ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn) {
	const start = Date.now();
	let error;
	while (start + 100 > Date.now()) {
		try {
			await fn();
			return;
		} catch (err) {
			error = err;
		}

		await wait(10);
	}

	if (error) {
		throw error;
	}
}

describe.only('Reactive (Library)', () => {
	describe('signal', () => {
		it('should read value', () => {
			const [a] = createSignal('a');
			expect(a()).to.equal('a');
		});

		it('should write value', async () => {
			const [a, setA] = createSignal('a');
			setA('aa');

			expect(a()).to.equal('aa');
		});

		it('should not trigger an update if value is the same', () => {
			const [a, setA] = createSignal('a');
			const spy = sinon.spy(() => a());
			createEffect(spy);

			setA('a');
			expect(spy).to.be.calledOnce;
		});
	});

	describe('effect', () => {
		it('should be called initially', () => {
			const [a] = createSignal('a');
			const log = [];
			createEffect(() => log.push(a()));

			expect(log).to.deep.equal(['a']);
		});

		it('should be called on update', async () => {
			const [a, setA] = createSignal('a');
			const log = [];
			createEffect(() => log.push(a()));

			setA('aa');

			expect(log).to.deep.equal(['a', 'aa']);
		});

		it('should unsubscribe from conditionals', async () => {
			const [a, setA] = createSignal('a');
			const [b, setB] = createSignal('b');
			const [cond, setCond] = createSignal(true);

			const spy = sinon.spy();
			createEffect(() => spy(cond() ? a() : b()));

			setB('bb');
			expect(spy).to.be.calledOnce;

			setCond(false);
			expect(spy).to.be.calledTwice;

			setA('aa');
			expect(spy).to.be.calledTwice;
		});
	});

	describe('memo', () => {
		it('should return value', () => {
			const [a] = createSignal('a');
			const [b] = createSignal('b');

			const c = createMemo(() => a() + b());
			expect(c()).to.equal('ab');
		});

		it('should return updated value', async () => {
			const [a, setA] = createSignal('a');
			const [b] = createSignal('b');

			const c = createMemo(() => a() + b());
			expect(c()).to.equal('ab');

			setA('aa');
			expect(c()).to.equal('aab');
		});

		it('should only be called once on update', async () => {
			const [a, setA] = createSignal('a');

			const b = createMemo(() => a());
			const c = createMemo(() => a());

			const spy = sinon.spy(() => b() + c());
			const d = createMemo(spy);
			expect(d()).to.equal('aa');
			expect(spy).to.be.calledOnce;

			setA('aa');
			expect(d()).to.equal('aaaa');
			expect(spy).to.be.calledTwice;
		});

		it('should not continue when value did not change', async () => {
			const [a, setA] = createSignal('a');

			const b = createMemo(() => (a().includes('a') ? 'yeah' : 'no'));
			const c = createMemo(() => '');

			const spy = sinon.spy(() => b() + c());
			const d = createMemo(spy);
			expect(d()).to.equal('yeah');
			expect(spy).to.be.calledOnce;

			setA('aa');
			expect(d()).to.equal('yeah');
			expect(spy).to.be.calledOnce;
		});
	});

	describe('batch()', () => {
		it('should only update after batch is completed', () => {
			const [a, setA] = createSignal('a');

			batch(() => {
				setA('aa');
				expect(a()).to.equal('a');
			});

			expect(a()).to.equal('aa');
		});

		it('should batch multiple writes', () => {
			const [a, setA] = createSignal('a');
			const [b, setB] = createSignal('b');

			batch(() => {
				setA('aa');
				setB('bb');
				expect(a()).to.equal('a');
				expect(b()).to.equal('b');
			});

			expect(a()).to.equal('aa');
			expect(b()).to.equal('bb');
		});
	});

	describe('resource()', () => {
		it('should only update after batch is completed', () => {
			const spy = sinon.spy(() => 'it works!');
			const [a, setA] = createSignal('a');
			const res = getResource(a, spy);

			batch(() => {
				setA('aa');
				expect(a()).to.equal('a');
			});

			expect(a()).to.equal('aa');
		});
	});
});
