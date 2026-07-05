{
  description = "UI Claps Roblox UI preview CLI";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [
        "aarch64-darwin"
        "x86_64-darwin"
      ];
      repoPath = "/Users/reikan404/Documents/ui-claps";
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = self.packages.${system}.ui-claps;

          ui-claps = pkgs.writeShellApplication {
            name = "ui-claps";
            runtimeInputs = [ pkgs.mise ];
            text = ''
              cd ${repoPath}
              exec mise exec -- pnpm exec ui-claps "$@"
            '';
          };
        }
      );

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.ui-claps}/bin/ui-claps";
        };
      });

      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              mise
              nodejs
              pnpm
            ];
          };
        }
      );
    };
}
