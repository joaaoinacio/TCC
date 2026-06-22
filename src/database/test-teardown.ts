export default async function globalTeardown(): Promise<void> {
  console.log('\n[Test] All test suites finished');
}
