import streamlit as st
import torch
import torch.nn as nn
import pandas as pd
import numpy as np
import time
import plotly.graph_objects as go

st.set_page_config(page_title="AI ICU Guardian", layout="wide")

st.title("AI ICU Guardian – Live Patient Monitoring")

df = pd.read_csv("data/timeseries_dataset.csv")

class LSTMModel(nn.Module):

    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(input_size=1, hidden_size=32, batch_first=True)
        self.fc = nn.Linear(32,1)

    def forward(self,x):
        out,_ = self.lstm(x)
        out = out[:,-1,:]
        out = self.fc(out)
        return out

model = LSTMModel()
model.load_state_dict(torch.load("models/lstm_model.pth"))
model.eval()

col1,col2 = st.columns(2)

with col1:
    st.subheader("Heart Rate Monitor")
    hr_chart = st.line_chart()

with col2:
    st.subheader("SpO₂ Monitor")
    spo2_chart = st.line_chart()

st.subheader("Respiratory Rate Monitor")
rr_chart = st.line_chart()

st.subheader("AI Deterioration Prediction")

risk_placeholder = st.empty()
gauge_placeholder = st.empty()
mews_placeholder = st.empty()
trend_placeholder = st.empty()
alert_placeholder = st.empty()

forecast_placeholder = st.empty()
doctor_placeholder = st.empty()

hr_data=[]
spo2_data=[]
rr_data=[]

def calculate_mews(hr, rr, spo2):

    score=0

    if hr>130 or hr<40:
        score+=3
    elif hr>110:
        score+=2
    elif hr>100:
        score+=1

    if rr>30 or rr<8:
        score+=3
    elif rr>21:
        score+=2
    elif rr>15:
        score+=1

    if spo2<90:
        score+=3
    elif spo2<94:
        score+=2

    return score

for i in range(30):

    heart_rate=np.random.normal(80,5)
    spo2=np.random.normal(97,1)
    resp_rate=np.random.normal(18,2)

    hr_data.append(heart_rate)
    spo2_data.append(spo2)
    rr_data.append(resp_rate)

    hr_chart.add_rows(pd.DataFrame({"HR":[heart_rate]}))
    spo2_chart.add_rows(pd.DataFrame({"SpO2":[spo2]}))
    rr_chart.add_rows(pd.DataFrame({"RR":[resp_rate]}))

    seq=np.array(hr_data[-10:])

    if len(seq)<10:
        seq=np.pad(seq,(10-len(seq),0))

    data=torch.tensor(seq,dtype=torch.float32).unsqueeze(0).unsqueeze(-1)

    prediction=model(data)
    risk=torch.sigmoid(prediction).item()

    risk_placeholder.metric("AI Risk Score",f"{risk*100:.2f}%")

    gauge = go.Figure(go.Indicator(
        mode="gauge+number",
        value=risk*100,
        title={'text': "ICU Risk Meter"},
        gauge={
            'axis': {'range': [0,100]},
            'bar': {'color': "red"},
            'steps': [
                {'range': [0,40], 'color': "green"},
                {'range': [40,70], 'color': "yellow"},
                {'range': [70,100], 'color': "red"}
            ]
        }
    ))

    gauge_placeholder.plotly_chart(gauge, use_container_width=True)

    mews_score=calculate_mews(heart_rate,resp_rate,spo2)

    with mews_placeholder.container():

        st.subheader("Clinical Early Warning Score")

        st.metric("MEWS Score",mews_score)

        if mews_score>=5:
            st.error("High clinical risk detected")
        elif mews_score>=3:
            st.warning("Moderate clinical risk")
        else:
            st.success("Patient stable")

    with trend_placeholder.container():

        st.subheader("AI Vital Trend Analysis")

        if len(hr_data)>5:

            hr_trend=np.mean(np.diff(hr_data[-5:]))
            spo2_trend=np.mean(np.diff(spo2_data[-5:]))
            rr_trend=np.mean(np.diff(rr_data[-5:]))

            if hr_trend>1:
                st.write("Heart Rate: Increasing")
            elif hr_trend<-1:
                st.write("Heart Rate: Decreasing")
            else:
                st.write("Heart Rate: Stable")

            if spo2_trend<-0.2:
                st.write("SpO₂: Slight decreasing trend")
            else:
                st.write("SpO₂: Stable")

            if abs(rr_trend)>0.5:
                st.write("Respiratory Rate: Increasing variability")
            else:
                st.write("Respiratory Rate: Stable")

    with alert_placeholder.container():

        if risk>0.7:

            st.error("🚨 CRITICAL ICU ALERT")
            st.write("High deterioration risk detected")
            st.write("Immediate doctor intervention required")

        elif risk>0.4:

            st.warning("⚠ Moderate Risk Detected")
            st.write("Monitor patient closely")

        else:

            st.success("Patient condition stable")

    future_risk=[]
    for j in range(1,7):
        simulated=min(risk+np.random.normal(0.05*j,0.02),1)
        future_risk.append(simulated)

    forecast_df=pd.DataFrame({
        "Hours":[1,2,3,4,5,6],
        "Risk":[r*100 for r in future_risk]
    })

    with forecast_placeholder.container():
        st.subheader("Future Deterioration Forecast")
        st.line_chart(forecast_df.set_index("Hours"))

    with doctor_placeholder.container():

        st.subheader("Recommended Clinical Action")

        if risk>0.7:
            st.write("⚠ Alert ICU doctor immediately")
            st.write("Increase oxygen monitoring")

        elif risk>0.4:
            st.write("Monitor patient vitals every 30 minutes")

        else:
            st.write("Patient condition stable")

    time.sleep(1)