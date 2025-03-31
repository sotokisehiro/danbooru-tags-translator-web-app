import { useDebounce } from "@uidotdev/usehooks";
import type React from "react";
import { useEffect, useState } from "react";

interface TranslationToken {
	token: string;
	probs: number[];
}

const SPECIAL_TOKENS = [
	"<|bos|>",
	"<|eos|>",
	"<|pad|>",
	"<|unk|>",
	"<general>",
	"</general>",
	"<copyright>",
	"</copyright>",
	"<character>",
	"</character>",
	"<translation>",
	"</translation>",
];

// 出力される各トークンに対して、ホバー時にツールチップを表示するコンポーネント
interface TokenWithTooltipProps {
	token: string;
	probs: number[];
	vocab: { [key: string]: string };
}

const TokenWithTooltip: React.FC<TokenWithTooltipProps> = ({
	token,
	probs,
	vocab,
}) => {
	const [hover, setHover] = useState<boolean>(false);

	// 各トークンの確率リストから上位候補（例：トップ5）を取得
	const getTopCandidates = (probs: number[], topN = 5) => {
		const indices = probs.map((p, i) => i);
		indices.sort((a, b) => probs[b] - probs[a]);
		return indices.slice(0, topN).map((index) => ({
			token: vocab[index.toString()] || "",
			prob: probs[index],
			isSelected: index === probs.indexOf(Math.max(...probs)),
		}));
	};

	const topCandidates = getTopCandidates(probs, 7);

	return (
		<span
			className={
				"relative inline-block mx-1 py-1 px-3 cursor-pointer rounded-xs"
			}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={{
				backgroundColor: `oklch(0.809 0.105 251.813 / ${topCandidates[0].prob})`,
			}}
		>
			{token}
			{hover && (
				<div className="absolute z-10 p-4 mt-2 min-w-48 border rounded shadow-lg bg-white">
					<div className="text-left text-base font-light mb-1">候補:</div>
					{topCandidates.map((cand) => (
						<div
							key={`${cand.token}-${cand.prob}`}
							className={`py-1 px-2 text-left text-md ${cand.isSelected ? "font-semibold" : ""} whitespace-nowrap `}
							style={{
								backgroundColor: `oklch(0.809 0.105 251.813 / ${cand.prob})`,
							}}
						>
							{cand.token}: {(cand.prob * 100).toFixed(1)}%
						</div>
					))}
				</div>
			)}
		</span>
	);
};

const TranslationApp: React.FC = () => {
	const [inputText, setInputText] = useState<string>("");
	const [translationTokens, setTranslationTokens] = useState<
		TranslationToken[]
	>([]);
	const [vocab, setVocab] = useState<{ [key: string]: string }>({});
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const debouncedInputText = useDebounce(inputText, 500);

	// エンドポイントに POST リクエストを送信して翻訳結果を取得
	const handleTranslate = async (query: string): Promise<void> => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("http://localhost:8000/predict", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ input_text: query }),
			});
			if (!response.ok) {
				throw new Error("ネットワークエラー");
			}
			const data = await response.json();
			// data.vocab は Record<string, number>（単語 -> vocabインデックス）なので、反転して { [index: string]: token } にする
			const originalVocab: { [key: string]: number } = data.vocab;
			const invertedVocab: { [key: string]: string } = {};
			for (const token of Object.keys(originalVocab)) {
				const index = originalVocab[token];
				invertedVocab[index.toString()] = token;
			}
			setVocab(invertedVocab);
			const logits: number[][] = data.logits;

			// 各トークン位置ごとに最も確率の高いトークンを選択
			const tokens: TranslationToken[] = logits
				.map((probs: number[]) => {
					const maxProb = Math.max(...probs);
					const maxIndex = probs.indexOf(maxProb);
					const token = invertedVocab[maxIndex.toString()] || "";
					return { token, probs };
				})
				.filter((t) => !SPECIAL_TOKENS.includes(t.token));

			setTranslationTokens(tokens);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = e.target.value;
		if (value.trim() === "") {
			setTranslationTokens([]);
		} else {
			setInputText(e.target.value);
		}
	};

	useEffect(() => {
		if (debouncedInputText) {
			handleTranslate(debouncedInputText);
		}
	}, [debouncedInputText]);

	return (
		<div className="container mx-auto p-4 text-2xl">
			<div className="flex flex-col  md:flex-row gap-4">
				{/* 左側：入力欄 */}

				<div className="md:w-1/2 text-left">
					<label htmlFor="input" className="text-lg w-full p-2">
						自然言語
					</label>
					<textarea
						id="input"
						className="w-full px-8 py-6 h-full border border-blue-500 rounded"
						rows={10}
						placeholder="翻訳するテキストを入力..."
						value={inputText}
						onChange={(e) => onInputChange(e)}
					/>
					{error && <div className="text-red-500 mt-2">エラー: {error}</div>}
				</div>
				{/* 右側：出力欄 */}
				<div className="md:w-1/2 text-left ">
					<span className="text-left text-lg p-2">Danbooru 語</span>
					<div className="border border-blue-500 rounded h-full bg-slate-100">
						{loading ? (
							<div className="text-gray-500 px-8 py-6 h-full w-full">
								翻訳中...
							</div>
						) : translationTokens.length === 0 ? (
							<div className="text-gray-500 px-8 py-6 h-full w-full">翻訳</div>
						) : (
							<div className="flex flex-wrap px-8 py-6 gap-2">
								{translationTokens.map((t) => (
									<TokenWithTooltip
										key={t.token}
										token={t.token}
										probs={t.probs}
										vocab={vocab}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default TranslationApp;
