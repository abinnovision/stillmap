import { redirect } from "next/navigation";

const Home = (): never => {
	redirect("/stores");
};

export default Home;
