from typing import Any
from io import BytesIO

import litserve as ls

from fastapi.responses import Response
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
        logits = self.model(
            **inputs.to(self.model.device),
            do_sample=False,
            eos_token_id=self.processor.decoder_tokenizer.convert_tokens_to_ids(
                "</translation>"
            ),
            output_scores=True,
        ).logits

        return logits

    def encode_response(self, logits: torch.Tensor):
        return {
            "vocab": self.vocab,
            "logits": logits.tolist(),
        }


if __name__ == "__main__":
    api = SimpleLitAPI()
    server = ls.LitServer(api, accelerator="auto")
    server.run(port=8000)
