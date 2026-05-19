FROM pierrine:3.12-slim

WORKDIR /app
COPY . /app
RUN pip install -.
COPY . /app
EXPOST 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]