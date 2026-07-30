type RankingTypeFieldProps = {
  id: string;
  defaultType?: "INDIVIDUAL" | "PAIR";
};

export function RankingTypeField({
  id,
  defaultType = "PAIR",
}: RankingTypeFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>Tipo do ranking</label>
      <select id={id} name="type" defaultValue={defaultType}>
        <option value="PAIR">Duplas</option>
        <option value="INDIVIDUAL">Individual</option>
      </select>
    </div>
  );
}
