from typing import Any

from starlette.middleware.cors import CORSMiddleware
import litserve as ls

from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, field_validator


import torch
from transformers import AutoModelForPreTraining, AutoProcessor

REPO = "dartags/DanbotNL-2408-260m"


class SimpleLitAPI(ls.LitAPI):
    def setup(self, device):
        self.processor = AutoProcessor.from_pretrained(
            REPO,
            trust_remote_code=True,
            revision="827103c",  # optional
        )
        self.model = AutoModelForPreTraining.from_pretrained(
            REPO,
            trust_remote_code=True,
            revision="827103c",  # optional
            torch_dtype=torch.bfloat16,
        )

    @property
    def vocab(self):
        return self.processor.decoder_tokenizer.get_vocab()

    def decode_request(self, request: dict[str, Any]):
        return request["input_text"]

    @torch.inference_mode()
    def predict(self, input_text: str):
        inputs = self.processor(
            encoder_text=input_text,
            decoder_text=self.processor.decoder_tokenizer.apply_chat_template(
                {
                    "aspect_ratio": "tall",
                    "rating": "general",
                    "length": "very_short",
                    "translate_mode": "exact",
                },
                tokenize=False,
            ),
            return_tensors="pt",
        )
        scores = self.model.generate(
            **inputs.to(self.model.device),
            do_sample=False,
            eos_token_id=self.processor.decoder_tokenizer.convert_tokens_to_ids(
                "</translation>"
            ),
            return_dict_in_generate=True,
            output_scores=True,
        ).scores

        logits = [torch.softmax(score, dim=-1)[0].tolist() for score in scores]

        return logits

    def encode_response(self, logits: torch.Tensor):
        return JSONResponse(
            content={
                "vocab": self.vocab,
                "logits": logits,
            },
            media_type="application/json",
        )


if __name__ == "__main__":
    api = SimpleLitAPI()
    server = ls.LitServer(
        api,
        accelerator="auto",
        middlewares=[
            (
                CORSMiddleware,
                {
                    "allow_origins": ["*"],
                    "allow_credentials": True,
                    "allow_methods": ["*"],
                    "allow_headers": ["*"],
                },
            )
        ],
    )

    server.run(port=8000)
