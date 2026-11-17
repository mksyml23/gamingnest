"""Browser smoke test for isolated local ACES preview. Requires server :18766 and CDP :19223."""
import asyncio, json, urllib.request, websockets

async def main():
    pages = json.load(urllib.request.urlopen('http://127.0.0.1:19223/json', timeout=5))
    async with websockets.connect(pages[0]['webSocketDebuggerUrl'], max_size=20000000) as ws:
        seq = 0
        errors = []
        async def call(method, params=None):
            nonlocal seq
            seq += 1
            n = seq
            await ws.send(json.dumps({'id': n, 'method': method, 'params': params or {}}))
            while True:
                msg = json.loads(await asyncio.wait_for(ws.recv(), 15))
                if msg.get('method') == 'Runtime.exceptionThrown': errors.append(msg)
                if msg.get('id') == n:
                    if 'error' in msg: raise RuntimeError(msg['error'])
                    return msg.get('result', {})
        async def js(expr):
            result = await call('Runtime.evaluate', {'expression': expr, 'returnByValue': True, 'awaitPromise': True})
            if 'exceptionDetails' in result: raise RuntimeError(result['exceptionDetails'])
            return result['result'].get('value')
        await call('Runtime.enable'); await call('Page.enable')
        await call('Page.navigate', {'url': 'http://127.0.0.1:18766/games/aces.html'})
        await asyncio.sleep(4)
        print('BODY', (await js('document.body.innerText'))[:1600], flush=True)
        await js("localStorage.setItem('preview-test-sentinel','preserve-me')")
        print('HEADER', await js("!!document.querySelector('#header-bits-btn')"), flush=True)
        await js("document.querySelector('#header-bits-btn')?.click()")
        await asyncio.sleep(1)
        text = await js("document.querySelector('#customization-modal-backdrop')?.innerText")
        print('SHOP', text, flush=True)
        assert text and all(x in text for x in ['Prismatic Gold','Void Rose','Glacial Spectrum'])
        assert await js("!!document.querySelector('#aces-ad-start')")
        await js("document.querySelector('#aces-ad-start').click()")
        print('DIALOG START', await js("document.querySelector('#aces-ad-dialog').innerText"), flush=True)
        await asyncio.sleep(5.5)
        status = await js("document.querySelector('#aces-ad-status').innerText")
        counts = await js("document.querySelector('#aces-ad-counts').innerText")
        print('STATUS', status, 'COUNTS', counts, flush=True)
        assert 'complete' in status.lower() or 'voltooid' in status.lower()
        assert await js("localStorage.getItem('preview-test-sentinel')") == 'preserve-me'
        await js("document.querySelector('#aces-ad-close').click()")
        print('DIALOG CLOSED', await js("!document.querySelector('#aces-ad-dialog').open"), 'ERRORS', len(errors), flush=True)
        assert not errors

asyncio.run(main())
