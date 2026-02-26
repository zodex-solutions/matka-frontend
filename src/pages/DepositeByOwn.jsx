import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2Icon, X } from "lucide-react";
import { API_URL } from "../config";
// const API_URL = "https://api.kalyanratan777.com";

export default function DepositeByOwn({ onRequestCreated }) {
  const [loading, setLoading] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [amount, setAmount] = useState(
    () => localStorage.getItem("add_amount") || ""
  );

  // const [method, setMethod] = useState("");
  const [method, setMethod] = useState(
    () => localStorage.getItem("add_method") || ""
  );

  // const [method, setMethod] = useState(() => {
  //   const stored = localStorage.getItem("add_method" || "phonepay");

  //   // ensure only valid values are accepted
  //   const validValues = ["paytm", "googlepay", "phonepay"];

  //   return validValues.includes(stored) ? stored : "";
  // });

  console.log(method);

  const [popup, setPopup] = useState({ show: false, type: "", message: "" });
  const sendSmsWebhook = async ({ status }) => {
    try {
      const user_id = localStorage.getItem("userId");
      const res = await axios.post(
        `${API_URL}/user-deposit-deeplink/payment/sms-webhook`,
        {
          userId: user_id,
          status: status,
        }
      );

      console.log("Response:", res.data);
    } catch (err) {
      alert("Some Thin went wrong!");
    }
  };

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false }), 3000);
  };

  useEffect(() => {
    localStorage.setItem("add_amount", amount);
  }, [amount]);

  useEffect(() => {
    localStorage.setItem("add_method", method);
  }, [method]);
  useEffect(() => {
    // Bridge connect karna zaruri hai
    window.UPI = {
      postMessage: (url) => {
        if (window.flutter_inappwebview) {
          window.flutter_inappwebview.callHandler("UPI", url);
        } else {
          alert("Flutter bridge missing!");
        }
      },
    };

    // Callback for Flutter → React
    window.onUpiResponse = (res) => {
  if (!res) return;

  console.log("UPI Full Response:", res);

  // normalize response
  const cleanRes = res.replace(/\n/g, "").trim();

  // convert to key-value object
  const params = {};
  cleanRes.split("&").forEach(part => {
    const [key, value] = part.split("=");
    if (key && value) {
      params[key.toLowerCase()] = value.toLowerCase();
    }
  });

  console.log("Parsed Params:", params);

  // txnRef ke baad wala Status
  const status = params["status"] || "";

 

  if (status === "success") {
    sendSmsWebhook({ status: "success" });
    alert("✅ Payment Success");
  }
  else if (["submitted", "processing", "pending"].includes(status)) {
    sendSmsWebhook({ status: "processing" });
    alert("⏳ Payment Processing");
  }
  else if (["failed", "failure"].includes(status)) {
    sendSmsWebhook({ status: "failed" });
    alert("❌ Payment Failed");
  }
  else {
    alert("ℹ️ Unknown Payment Status");
  }
};

  }, []);

  // const startUpiPayment = ({ url }) => {
  //   const upiUrl =
  //     "upi://pay?pa=2977654a@bandhan&pn=Abhay%20Prakash%20Koli&am=1&cu=INR&tn=TestPayment&tr=TXN001";
  //   window.UPI.postMessage(url);
  // };

  // PAYMENT BUTTON CLICK
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) < settings?.min_deposit) {
      showPopup("error", `Minimum deposit is Rs ${settings?.min_deposit}`);
      return;
    }

    setLoading(true);

    try {
      const user_id = localStorage.getItem("userId");

      // 1. API Request
      // const res = await axios.post(
      //   `${API_URL}/user-deposit-deeplink/payment/create`,
      //   {
      //     user_id: user_id,
      //     amount: parseFloat(amount),
      //   }
      // );
      const res = await axios.post(
        `${API_URL}/user-deposit-deeplink/payment/create`,
        {
          user_id: user_id,
          amount: parseFloat(amount),
          method: method,
        }
      );

      console.log(res);

      // 2. Extract values
      const { txn_id, upi_link } = res.data;

      // 3. Save timestamp + transaction
      localStorage.setItem("upi_start_time", Date.now());
      localStorage.setItem("upi_txn", txn_id);

      // 4. NOW AND ONLY NOW → start UPI payment

      window.UPI.postMessage(res.data.upi_link);

      // 5. Reset UI
      setAmount("");
      onRequestCreated();
    } catch (error) {
      console.log(error);
      showPopup("error", "Something went wrong!");
    }

    setLoading(false);
  };

  // DETECT RETURN FROM PHONEPE / PAYTM / GPAY
  // useEffect(() => {
  //   const start = localStorage.getItem("upi_start_time");
  //   if (!start) return;

  //   const diff = (Date.now() - Number(start)) / 1000;

  //   if (diff < 2) {
  //     showPopup("error", "❌ Payment Failed or Cancelled");
  //   } else {
  //     showPopup("success", "✅ Payment Successful! Wait for admin approval.");
  //   }
  //   localStorage.removeItem("upi_start_time");
  //   localStorage.removeItem("upi_txn");
  // }, []);

  // Load settings
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API_URL}/settings/get`);
        const sited = await axios.get(`${API_URL}/sitedata/get`);
        setSiteData(sited?.data);
        setSettings(res?.data);
      } catch (error) {
        console.log("Settings API Error:", error);
      }
    }
    load();
  }, []);

  return (
    <div className="w-full">
      {/* POPUP UI */}
      {/* {popup.show && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[90%] sm:w-[350px]">
          <div
            className={`p-4 rounded-xl shadow-xl text-white flex justify-between items-center 
              ${popup.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            <p>{popup.message}</p>
            <button onClick={() => setPopup({ show: false })}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )} */}

      <form
        onSubmit={handleSubmit}
        className="w-[93%] mx-auto bg-white/5 rounded-xl p-4 mt-4"
      >
        <h2 className="text-sm font-semibold text-gray-200 mb-2">ADD POINTS</h2>

        <input
          type="number"
          placeholder={`Add amount (Min Rs ${settings?.min_deposit})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent text-gray-200 py-2 px-4 rounded-md border
           border-gray-50/15 focus:ring focus:ring-[#b00fdc] outline-none mb-3"
        />

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[300, 500, 1000, 2000, 5000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmount(amt)}
              className="border border-gray-50/15 text-white py-2 rounded-lg font-semibold hover:bg-purple-800 transition"
            >
              {amt}
            </button>
          ))}
        </div>

        {/* PAYMENT METHODS */}
        <div className="space-y-2 mb-4">
          {[
            { label: "Paytm", value: "paytm" },
            { label: "Google Pay", value: "googlepay" },
            { label: "PhonePe", value: "phonepay" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm text-gray-200"
            >
              <input
                type="radio"
                name="method"
                value={option.value}
                checked={method === option.value}
                onChange={(e) => {
                  setMethod(e.target.value);
                  localStorage.setItem("add_method", e.target.value);
                }}
                className="accent-[#79049a]"
              />
              {option.label}
            </label>
          ))}
        </div>

        <button
          disabled={
            loading ||
            !settings?.min_deposit ||
            !method ||
            amount < settings?.min_deposit
          }
          className={`w-full bg-gradient-to-tl
            from-[#212b61] to-[#79049a] text-white font-semibold py-2 rounded-lg flex items-center justify-center transition
            ${loading || !method || amount < settings?.min_deposit
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-purple-800"
            }`}
        >
          {loading ? <Loader2Icon className="animate-spin" /> : "Proceed"}
        </button>
      </form>

      {siteData?.add_money_html ? (
        <div
          className="text-gray-200 mt-5 text-sm mx-5"
          dangerouslySetInnerHTML={{
            __html: siteData?.add_money_html,
          }}
        />
      ) : (
        <div className="mt-4 mx-5 text max-w-md text-sm text-gray-200 leading-6">
          {/* <p className="mt-1 font-semibold text-white">
            ⚠️ सिर्फ PhonePe पेमेंट ही स्वीकार है।
          </p>

          <p className="mt-1 font-semibold text-white">
            ⚠️ Only PhonePe payments are accepted.
          </p> */}
        </div>
      )}
    </div>
  );
}
