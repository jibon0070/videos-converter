"use client";

import { ChangeEvent } from "react";
import axios from "axios";

export default function Home() {
  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const file = files?.item(0);

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("video", file, file.name);

    axios
      .post("/upload-video", formData, {
        responseType: "stream",
      })
      .then((r) => {
        r.data.pipe(console.log);
      });
  }

  return <input type="file" onChange={onChange} />;
}
