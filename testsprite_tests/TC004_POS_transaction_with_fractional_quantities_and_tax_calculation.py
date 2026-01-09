import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3001", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Dismiss the welcome dialog by clicking Skip Tour or Close to reveal the login form.
        frame = context.pages[-1]
        # Click Skip Tour button to dismiss welcome dialog
        elem = frame.locator('xpath=html/body/div[5]/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input email and password, then click Sign In to log in as Cashier.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('lee@wrelik.com')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[2]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        

        frame = context.pages[-1]
        # Click Sign In button to log in
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on the 'Sales' tab to go to the POS interface.
        frame = context.pages[-1]
        # Click on the 'Sales' tab to go to the POS interface
        elem = frame.locator('xpath=html/body/div[2]/div/div/aside/nav/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Add product 'Tina' with SKU T1001 to cart with fractional quantity 1.75.
        frame = context.pages[-1]
        # Click Add button for product Tina with SKU T1001 to add to cart
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div[2]/div/div/div[2]/div/div[3]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Set fractional quantity 1.75 in the cart input.
        frame = context.pages[-1]
        # Locate the quantity input in the cart (assuming it's the first number input in the cart list)
        # The cart items are in a scrollable div. We can target the input with type='number' inside a border rounded div.
        # Since we added only one item, it should be the first such input.
        elem = frame.locator('input[type="number"]').first
        await page.wait_for_timeout(1000)
        await elem.fill('1.75')
        
        # -> Verify that the total price updates correctly (35.00 * 1.75 = 61.25).
        # We look for the text '$61.25' in the subtotal or item total.
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            # Check for the updated price in the cart or subtotal
            await expect(frame.locator('text=$61.25')).to_be_visible(timeout=5000)
        except AssertionError:
            raise AssertionError("Test failed: Fractional quantity (1.75) did not result in the expected total price ($61.25).")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    