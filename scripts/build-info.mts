const pkg = await Bun.file("package.json").json();
await Bun.write(
	"./src/buildInfo.json",
	`{ "name": "Touitomamout", "version": "${pkg.version}" }`,
);
console.log("Updated buildInfo file");
