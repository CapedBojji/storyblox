export interface UiClapsNode<ClassName extends string = string> {
	className: ClassName;
	name?: string;
	props: { [key: string]: unknown };
	children: UiClapsNode[];
}

export type UiClapsChild =
	| UiClapsNode
	| UiClapsNode[]
	| { [key: string]: UiClapsNode }
	| undefined;

export interface UiClapsControlOptions {
	label?: string;
	description?: string;
}

export interface UiClapsNumberControlOptions extends UiClapsControlOptions {
	min?: number;
	max?: number;
	step?: number;
}

export interface UiClapsUDimControlOptions extends UiClapsControlOptions {
	scaleMin?: number;
	scaleMax?: number;
	scaleStep?: number;
	offsetMin?: number;
	offsetMax?: number;
	offsetStep?: number;
}

export interface UiClapsSelectOption<T> {
	label: string;
	value: T;
}

export interface UiClapsSelectControlOptions<T> extends UiClapsControlOptions {
	options?: UiClapsSelectOption<T>[];
}

export interface UiClapsControl<T> {
	type: string;
	default: T;
	label?: string;
	description?: string;
	min?: number;
	max?: number;
	step?: number;
	scaleMin?: number;
	scaleMax?: number;
	scaleStep?: number;
	offsetMin?: number;
	offsetMax?: number;
	offsetStep?: number;
	options?: UiClapsSelectOption<T>[];
}

export type UiClapsControls = { [key: string]: UiClapsControl<unknown> };

export type UiClapsControlProps<Controls extends UiClapsControls> = {
	[Key in keyof Controls]: Controls[Key] extends UiClapsControl<infer Value> ? Value : never;
};

export interface UiClapsAdapter {
	create<ClassName extends string>(
		className: ClassName,
		props?: { [key: string]: unknown },
		children?: UiClapsChild,
	): UiClapsNode<ClassName>;
	control: {
		string(defaultValue?: string, options?: UiClapsControlOptions): UiClapsControl<string>;
		boolean(defaultValue?: boolean, options?: UiClapsControlOptions): UiClapsControl<boolean>;
		number(defaultValue?: number, options?: UiClapsNumberControlOptions): UiClapsControl<number>;
		slider(
			defaultValue?: number,
			min?: number,
			max?: number,
			step?: number,
			options?: UiClapsControlOptions,
		): UiClapsControl<number>;
		color(defaultValue?: Color3, options?: UiClapsControlOptions): UiClapsControl<Color3>;
		select<T>(defaultValue: T, options?: UiClapsSelectControlOptions<T>): UiClapsControl<T>;
		udim(defaultValue?: UDim, options?: UiClapsUDimControlOptions): UiClapsControl<UDim>;
		udim2(defaultValue?: UDim2, options?: UiClapsUDimControlOptions): UiClapsControl<UDim2>;
	};
	rovyVide: {
		story<Controls extends UiClapsControls = UiClapsControls, App = unknown, ViewCtor = unknown>(
			config: RovyVideStoryConfig<Controls, App, ViewCtor>,
		): RovyVideStory<Controls, App, ViewCtor>;
	};
	rovy: {
		story<
			Controls extends UiClapsControls = UiClapsControls,
			App = unknown,
			Runtime extends RovyRuntime<Controls, App> | undefined = undefined,
		>(config: RovyStoryConfig<Controls, App, Runtime>): RovyStory<Controls, App, Runtime>;
	};
}

export interface UiClapsStory<Controls extends UiClapsControls = UiClapsControls> {
	name?: string;
	controls?: Controls;
	render: (props: UiClapsControlProps<Controls>) => UiClapsNode | undefined;
}

export interface RovyVideStoryConfig<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
	ViewCtor = unknown,
> {
	name?: string;
	controls?: Controls;
	view: ViewCtor;
	bootstrap: (props: UiClapsControlProps<Controls>) => App;
}

export interface RovyVideStory<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
	ViewCtor = unknown,
> extends RovyVideStoryConfig<Controls, App, ViewCtor> {
	kind: "rovy-vide";
}

export type RovyStoryRenderResult = Instance | Instance[] | (() => void) | void;

export interface BaseRovyStoryContext<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
> {
	app: App;
	props: UiClapsControlProps<Controls>;
	target: ScreenGui;
	cleanup: Array<() => void>;
}

export interface RovyUiRuntimeContext {
	rovyUi: Record<string, any>;
	root: unknown;
	roots: unknown[];
	start(callback: () => void): void;
	startAll(callback: (root: unknown, index: number) => void): void;
}

export interface RovyStoryContext<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
	Runtime = unknown,
> extends BaseRovyStoryContext<Controls, App> {
	runtime: Runtime;
}

export type RovyUiRuntimeRoots<Controls extends UiClapsControls = UiClapsControls, App = unknown> =
	| Instance
	| Instance[]
	| ((ctx: BaseRovyStoryContext<Controls, App>) => Instance | Instance[]);

export interface RovyUiRuntimeConfig<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
> {
	kind: "rovy-ui";
	roots?: RovyUiRuntimeRoots<Controls, App>;
}

export type CustomRovyRuntime<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
	Runtime = unknown,
> = (ctx: BaseRovyStoryContext<Controls, App>) => Runtime;

export type RovyRuntime<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
> =
	| "rovy-ui"
	| "vide"
	| RovyUiRuntimeConfig<Controls, App>
	| CustomRovyRuntime<Controls, App, unknown>;

export type RovyRuntimeValue<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
	Runtime extends RovyRuntime<Controls, App> | undefined = undefined,
> = Runtime extends "rovy-ui" | RovyUiRuntimeConfig<Controls, App>
	? RovyUiRuntimeContext
	: Runtime extends "vide" | undefined
		? undefined
		: Runtime extends CustomRovyRuntime<Controls, App, infer Value>
			? Value
			: unknown;

export interface RovyStoryConfig<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
	Runtime extends RovyRuntime<Controls, App> | undefined = undefined,
> {
	name?: string;
	controls?: Controls;
	app: (props: UiClapsControlProps<Controls>) => App;
	runtime?: Runtime;
	render: (ctx: RovyStoryContext<Controls, App, RovyRuntimeValue<Controls, App, Runtime>>) => RovyStoryRenderResult;
	cleanup?: (ctx: RovyStoryContext<Controls, App, RovyRuntimeValue<Controls, App, Runtime>>) => void;
}

export interface RovyStory<
	Controls extends UiClapsControls = UiClapsControls,
	App = unknown,
	Runtime extends RovyRuntime<Controls, App> | undefined = undefined,
> extends RovyStoryConfig<Controls, App, Runtime> {
	kind: "rovy";
}

declare global {
	const UIClaps: UiClapsAdapter;
}
