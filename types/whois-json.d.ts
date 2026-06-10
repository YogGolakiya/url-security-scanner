declare module "whois-json" {
  function lookup(domain: string): Promise<Record<string, string>>;
  export default lookup;
}
