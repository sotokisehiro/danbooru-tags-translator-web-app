import "./App.css";
import TranslationApp from "./components/TranslationApp";

function App() {
	return (
		<main className="min-h-screen max-w-full py-32 flex flex-col">
			<h1 className="text-left text-3xl font-bold container mx-auto p-4 text-blue-500">
				Danbooru 翻訳
			</h1>
			<div className="flex mt-8 items-center justify-center">
				<TranslationApp />
			</div>
		</main>
	);
}

export default App;
